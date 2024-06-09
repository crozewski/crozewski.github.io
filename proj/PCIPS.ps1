# PCIPS - Parental Controls in PowerShell: A PowerShell script to manage parental controls

$logFilePath = "$env:USERPROFILE\PCIPS.log"
$allowedWebsites = @()

function Write-Log {
    param (
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $message"
    Add-Content -Path $logFilePath -Value $logMessage
    Write-Output $message
}

# Function to add firewall rules for allowed websites
function Add-AllowRules {
    param (
        [string[]]$websites
    )
    foreach ($website in $websites) {
        try {
            $ips = [System.Net.Dns]::GetHostAddresses($website) | ForEach-Object { $_.IPAddressToString }
            foreach ($ip in $ips) {
                New-NetFirewallRule -DisplayName "Allow $website" -Direction Outbound -RemoteAddress $ip -Action Allow -Profile Any -Description "Allow traffic to $website" -ErrorAction Stop
                Write-Log "Added allow rule for $website ($ip)"
            }
        } catch {
            Write-Log "Failed to add allow rule for $website: $_"
        }
    }
}

# Function to add a block rule for all other traffic
function Add-BlockRule {
    try {
        New-NetFirewallRule -DisplayName "Block all outbound traffic" -Direction Outbound -Action Block -Profile Any -Description "Block all outbound traffic except allowed websites" -ErrorAction Stop
        Write-Log "Added block rule for all outbound traffic"
    } catch {
        Write-Log "Failed to add block rule: $_"
    }
}

# Function to update the list of allowed websites
function Update-AllowedWebsites {
    param (
        [string[]]$newWebsites
    )
    $allowedWebsites += $newWebsites
    Add-AllowRules -websites $newWebsites
}

# Function to remove allowed websites from the list and firewall rules
function Remove-AllowedWebsites {
    param (
        [string[]]$websites
    )
    foreach ($website in $websites) {
        try {
            Get-NetFirewallRule -DisplayName "Allow $website" | Remove-NetFirewallRule -ErrorAction Stop
            $allowedWebsites = $allowedWebsites | Where-Object { $_ -ne $website }
            Write-Log "Removed allow rule for $website"
        } catch {
            Write-Log "Failed to remove allow rule for $website: $_"
        }
    }
}

# Function to list all allowed websites
function List-AllowedWebsites {
    Write-Log "Listing all allowed websites:"
    $allowedWebsites | ForEach-Object { Write-Output $_ }
}

# Function to show active firewall rules
function Show-ActiveRules {
    Write-Log "Displaying active firewall rules:"
    try {
        Get-NetFirewallRule | Select-Object -Property DisplayName, Direction, Action, Enabled, Profile | Format-Table -AutoSize
    } catch {
        Write-Log "Failed to display active firewall rules. Error: $_"
    }
}

# Function to set time-based access
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
        $action1 = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-Command `"New-NetFirewallRule -DisplayName 'Block all outbound traffic' -Direction Outbound -Action Block -Profile Any`""
        Register-ScheduledTask -TaskName "EnableBlockAllInternet" -Trigger $trigger1 -Action $action1 -RunLevel Highest
        
        $trigger2 = New-ScheduledTaskTrigger -Daily -At $endTime
        $action2 = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-Command `"Get-NetFirewallRule -DisplayName 'Block all outbound traffic' | Remove-NetFirewallRule`""
        Register-ScheduledTask -TaskName "DisableBlockAllInternet" -Trigger $trigger2 -Action $action2 -RunLevel Highest
        
        Write-Log "Successfully set time-based access from $StartTime to $EndTime."
    } catch {
        Write-Log "Failed to set time-based access. Error: $_"
    }
}

# Function to block an application
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

# Function to unblock an application
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
    Write-Output "* 1. Block Internet                 *"
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
                Write-Log "Blocking all internet except allowed websites..."
                Add-BlockRule
            }
            2 {
                $website = Read-Host "Enter the website URL to allow (e.g., https://example.com)"
                Update-AllowedWebsites -newWebsites @($website)
            }
            3 {
                $website = Read-Host "Enter the website URL to remove (e.g., https://example.com)"
                Remove-AllowedWebsites -websites @($website)
            }
            4 {
                List-AllowedWebsites
            }
            5 {
                Write-Log "Removing the 'Block All Internet' rule to restore internet access..."
                try {
                    Get-NetFirewallRule -DisplayName "Block all outbound traffic" | Remove-NetFirewallRule -ErrorAction Stop
                    Write-Log "Successfully removed the 'Block all outbound traffic' rule."
                } catch {
                    Write-Log "Failed to remove the 'Block all outbound traffic' rule. Error: $_"
                }
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
