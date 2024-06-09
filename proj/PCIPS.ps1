# PCIPS - Parental Controls in PowerShell: A PowerShell script to manage parental controls

$logFilePath = "$env:USERPROFILE\PCIPS.log"

function Write-Log {
    param (
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $message"
    Add-Content -Path $logFilePath -Value $logMessage
    Write-Output $message
}

function Initialize-Firewall {
    Write-Log "Initializing firewall to block all internet access..."
    try {
        # Remove any existing "Block All Internet" rule to prevent duplication
        Get-NetFirewallRule -DisplayName "Block All Internet" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        # Create a rule to block all outbound traffic
        New-NetFirewallRule -DisplayName "Block All Internet" -Direction Outbound -Action Block -Profile Any -ErrorAction Stop
        Write-Log "Successfully created a rule to block all outbound traffic."
    } catch {
        Write-Log "Failed to create a blocking rule. Error: $_"
    }
}

function Remove-BlockAllInternetRule {
    Write-Log "Removing the 'Block All Internet' rule to restore internet access..."
    try {
        Get-NetFirewallRule -DisplayName "Block All Internet" | Remove-NetFirewallRule -ErrorAction Stop
        Write-Log "Successfully removed the 'Block All Internet' rule."
    } catch {
        Write-Log "Failed to remove the 'Block All Internet' rule. Error: $_"
    }
}

function Add-AllowedWebsite {
    param (
        [string]$WebsiteUrl
    )
    Write-Log "Adding allowed website: $WebsiteUrl"
    try {
        $websiteHost = [System.Uri]::new($WebsiteUrl).Host
        $ipAddresses = [System.Net.Dns]::GetHostAddresses($websiteHost) | Where-Object { $_.AddressFamily -eq 'InterNetwork' }

        foreach ($ip in $ipAddresses) {
            try {
                New-NetFirewallRule -DisplayName "Allow $WebsiteUrl" -Direction Outbound -Action Allow -RemoteAddress $ip.IPAddressToString -Profile Any -ErrorAction Stop
                Write-Log "Successfully created a rule to allow traffic to $ip.IPAddressToString."
            } catch {
                Write-Log "Failed to create a rule for $ip.IPAddressToString. Error: $_"
            }
        }
    } catch {
        Write-Log "Failed to resolve IP addresses for $WebsiteUrl. Error: $_"
    }
}

function Remove-AllowedWebsite {
    param (
        [string]$WebsiteUrl
    )
    Write-Log "Removing allowed website: $WebsiteUrl"
    try {
        $websiteHost = [System.Uri]::new($WebsiteUrl).Host
        Get-NetFirewallRule | Where-Object { $_.DisplayName -like "Allow *$websiteHost*" } | Remove-NetFirewallRule -ErrorAction Stop
        Write-Log "Successfully removed the rule for $WebsiteUrl."
    } catch {
        Write-Log "Failed to remove the rule for $WebsiteUrl. Error: $_"
    }
}

function Get-AllowedWebsites {
    Write-Log "Listing all allowed websites:"
    try {
        $rules = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "Allow *" }
        if ($rules) {
            $rules | Select-Object -Property DisplayName | ForEach-Object { Write-Output $_.DisplayName }
        } else {
            Write-Log "No allowed websites found."
        }
    } catch {
        Write-Log "Failed to retrieve allowed websites. Error: $_"
    }
}

function Show-ActiveRules {
    Write-Log "Displaying active firewall rules:"
    try {
        Get-NetFirewallRule | Select-Object -Property DisplayName, Direction, Action, Enabled, Profile | Format-Table -AutoSize
    } catch {
        Write-Log "Failed to display active firewall rules. Error: $_"
    }
}

function Set-TimeBasedAccess {
    param (
        [string]$StartTime,
        [string]$EndTime
    )
    Write-Log "Setting time-based access from $StartTime to $EndTime..."
    try {
        # Convert times to DateTime
        $startTime = [DateTime]::Parse($StartTime)
        $endTime = [DateTime]::Parse($EndTime)
        
        # Create a scheduled task to enable the block all internet rule outside the specified times
        $trigger1 = New-ScheduledTaskTrigger -Daily -At $startTime
        $action1 = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-Command `"New-NetFirewallRule -DisplayName 'Block All Internet' -Direction Outbound -Action Block -Profile Any`""
        Register-ScheduledTask -TaskName "EnableBlockAllInternet" -Trigger $trigger1 -Action $action1 -RunLevel Highest
        
        $trigger2 = New-ScheduledTaskTrigger -Daily -At $endTime
        $action2 = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-Command `"Get-NetFirewallRule -DisplayName 'Block All Internet' | Remove-NetFirewallRule`""
        Register-ScheduledTask -TaskName "DisableBlockAllInternet" -Trigger $trigger2 -Action $action2 -RunLevel Highest
        
        Write-Log "Successfully set time-based access from $StartTime to $EndTime."
    } catch {
        Write-Log "Failed to set time-based access. Error: $_"
    }
}

function Block-Application {
    param (
        [string]$ApplicationPath
    )
    Write-Log "Blocking application: $ApplicationPath"
    try {
        New-NetFirewallRule -DisplayName "Block $ApplicationPath" -Direction Outbound -Action Block -Program $ApplicationPath -Profile Any -ErrorAction Stop
        Write-Log "Successfully created a rule to block the application: $ApplicationPath."
    } catch {
        Write-Log "Failed to block the application. Error: $_"
    }
}

function Unblock-Application {
    param (
        [string]$ApplicationPath
    )
    Write-Log "Unblocking application: $ApplicationPath"
    try {
        Get-NetFirewallRule | Where-Object { $_.DisplayName -eq "Block $ApplicationPath" } | Remove-NetFirewallRule -ErrorAction Stop
        Write-Log "Successfully removed the rule blocking the application: $ApplicationPath."
    } catch {
        Write-Log "Failed to unblock the application. Error: $_"
    }
}

function Show-Menu {
    Clear-Host
    Write-Output "*************************************"
    Write-Output "*        PCIPS - Parental Controls  *"
    Write-Output "*            in PowerShell          *"
    Write-Output "*************************************"
    Write-Output "* 1. Initialize Firewall            *"
    Write-Output "* 2. Add Allowed Website            *"
    Write-Output "* 3. Remove Allowed Website         *"
    Write-Output "* 4. List Allowed Websites          *"
    Write-Output "* 5. Remove 'Block All Internet'    *"
    Write-Output "* 6. Display Active Rules           *"
    Write-Output "* 7. Set Time-Based Access          *"
    Write-Output "* 8. Block Application              *"
    Write-Output "* 9. Unblock Application            *"
    Write-Output "* 10. Exit                          *"
    Write-Output "*************************************"
}

function Main {
    do {
        Show-Menu
        $choice = Read-Host "Enter your choice (1-10)"
        switch ($choice) {
            1 {
                Initialize-Firewall
            }
            2 {
                $website = Read-Host "Enter the website URL to allow (e.g., https://example.com)"
                Add-AllowedWebsite -WebsiteUrl $website
            }
            3 {
                $website = Read-Host "Enter the website URL to remove (e.g., https://example.com)"
                Remove-AllowedWebsite -WebsiteUrl $website
            }
            4 {
                Get-AllowedWebsites
            }
            5 {
                Remove-BlockAllInternetRule
            }
            6 {
                Show-ActiveRules
            }
            7 {
                $startTime = Read-Host "Enter the start time for internet access (e.g., 08:00 AM)"
                $endTime = Read-Host "Enter the end time for internet access (e.g., 08:00 PM)"
                Set-TimeBasedAccess -StartTime $startTime -EndTime $endTime
            }
            8 {
                $appPath = Read-Host "Enter the full path of the application to block (e.g., C:\Program Files\App\App.exe)"
                Block-Application -ApplicationPath $appPath
            }
            9 {
                $appPath = Read-Host "Enter the full path of the application to unblock (e.g., C:\Program Files\App\App.exe)"
                Unblock-Application -ApplicationPath $appPath
            }
            10 {
                Write-Output "Exiting..."
            }
            default {
                Write-Output "Invalid choice. Please select a number between 1 and 10."
            }
        }
        if ($choice -ne 10) {
            Read-Host "Press Enter to continue..."
        }
    } while ($choice -ne 10)
}

# Start the interactive menu
Main
