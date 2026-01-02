# WebGuard Manager: A PowerShell script to manage Windows Firewall rules for internet access

function Initialize-Firewall {
    Write-Output "Initializing firewall to block all internet access..."
    try {
        # Remove any existing "Block All Internet" rule to prevent duplication
        Get-NetFirewallRule -DisplayName "Block All Internet" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        # Create a rule to block all outbound traffic
        New-NetFirewallRule -DisplayName "Block All Internet" -Direction Outbound -Action Block -Profile Any -ErrorAction Stop
        Write-Output "Successfully created a rule to block all outbound traffic."
    } catch {
        Write-Output "Failed to create a blocking rule. Error: $_"
    }
}

function Remove-BlockAllInternetRule {
    Write-Output "Removing the 'Block All Internet' rule to restore internet access..."
    try {
        Get-NetFirewallRule -DisplayName "Block All Internet" | Remove-NetFirewallRule -ErrorAction Stop
        Write-Output "Successfully removed the 'Block All Internet' rule."
    } catch {
        Write-Output "Failed to remove the 'Block All Internet' rule. Error: $_"
    }
}

function Add-AllowedWebsite {
    param (
        [string]$WebsiteUrl
    )
    Write-Output "Adding allowed website: $WebsiteUrl"
    try {
        $websiteHost = [System.Uri]::new($WebsiteUrl).Host
        $ipAddresses = [System.Net.Dns]::GetHostAddresses($websiteHost) | Where-Object { $_.AddressFamily -eq 'InterNetwork' }

        foreach ($ip in $ipAddresses) {
            try {
                New-NetFirewallRule -DisplayName "Allow $WebsiteUrl" -Direction Outbound -Action Allow -RemoteAddress $ip.IPAddressToString -Profile Any -ErrorAction Stop
                Write-Output "Successfully created a rule to allow traffic to $ip.IPAddressToString."
            } catch {
                Write-Output "Failed to create a rule for $ip.IPAddressToString. Error: $_"
            }
        }
    } catch {
        Write-Output "Failed to resolve IP addresses for $WebsiteUrl. Error: $_"
    }
}

function Remove-AllowedWebsite {
    param (
        [string]$WebsiteUrl
    )
    Write-Output "Removing allowed website: $WebsiteUrl"
    try {
        $websiteHost = [System.Uri]::new($WebsiteUrl).Host
        Get-NetFirewallRule | Where-Object { $_.DisplayName -like "Allow *$websiteHost*" } | Remove-NetFirewallRule -ErrorAction Stop
        Write-Output "Successfully removed the rule for $WebsiteUrl."
    } catch {
        Write-Output "Failed to remove the rule for $WebsiteUrl. Error: $_"
    }
}

function Get-AllowedWebsites {
    Write-Output "Listing all allowed websites:"
    try {
        $rules = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "Allow *" }
        if ($rules) {
            $rules | Select-Object -Property DisplayName | ForEach-Object { Write-Output $_.DisplayName }
        } else {
            Write-Output "No allowed websites found."
        }
    } catch {
        Write-Output "Failed to retrieve allowed websites. Error: $_"
    }
}

function Show-Menu {
    Clear-Host
    Write-Output "WebGuard Manager"
    Write-Output "1. Initialize Firewall (Block all traffic)"
    Write-Output "2. Add Allowed Website"
    Write-Output "3. Remove Allowed Website"
    Write-Output "4. List Allowed Websites"
    Write-Output "5. Remove 'Block All Internet' Rule"
    Write-Output "6. Exit"
}

function Main {
    do {
        Show-Menu
        $choice = Read-Host "Enter your choice (1-6)"
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
                Write-Output "Exiting..."
            }
            default {
                Write-Output "Invalid choice. Please select a number between 1 and 6."
            }
        }
        if ($choice -ne 6) {
            Read-Host "Press Enter to continue..."
        }
    } while ($choice -ne 6)
}

# Start the interactive menu
Main
