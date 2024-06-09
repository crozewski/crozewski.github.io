# Script Name: PCIPS-Init.ps1
# Description: This script interactively prompts for a list of allowed websites and blocks all other internet traffic using Windows Firewall rules.
# Author: [Your Name]
# Date: [Date]

# Function to log messages
function Log-Message {
    param (
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Output "$timestamp - $message"
}

# Function to create firewall rules
function Create-FirewallRules {
    param (
        [string[]]$allowedURLs
    )

    # Clear existing custom firewall rules
    Get-NetFirewallRule -DisplayName "PCIPS-*" | Remove-NetFirewallRule

    # Allow loopback traffic
    New-NetFirewallRule -DisplayName "PCIPS-Allow-Loopback" -Direction Outbound -Action Allow -LocalAddress "127.0.0.1" -RemoteAddress "127.0.0.1"

    # Allow Windows Update traffic (example IP ranges and domain names for illustration purposes)
    $windowsUpdateDomains = @(
        "windowsupdate.microsoft.com",
        "update.microsoft.com",
        "download.windowsupdate.com",
        "update.microsoft.com",
        "au.windowsupdate.microsoft.com",
        "bg.v4.download.windowsupdate.com"
    )

    foreach ($domain in $windowsUpdateDomains) {
        try {
            $ipAddresses = [System.Net.Dns]::GetHostAddresses($domain)
            foreach ($ip in $ipAddresses) {
                New-NetFirewallRule -DisplayName "PCIPS-Allow-$domain" -Direction Outbound -Action Allow -RemoteAddress $ip.IPAddressToString
                Log-Message "Allowed Windows Update domain: $domain ($ip)"
            }
        } catch {
            Log-Message "Error: Unable to resolve IP for Windows Update domain: $domain"
        }
    }

    foreach ($url in $allowedURLs) {
        try {
            $ipAddresses = [System.Net.Dns]::GetHostAddresses($url)
            foreach ($ip in $ipAddresses) {
                New-NetFirewallRule -DisplayName "PCIPS-Allow-$url" -Direction Outbound -Action Allow -RemoteAddress $ip.IPAddressToString
                Log-Message "Allowed URL: $url ($ip)"
            }
        } catch {
            Log-Message "Error: Unable to resolve IP for URL: $url"
        }
    }

    # Block all other outbound traffic
    New-NetFirewallRule -DisplayName "PCIPS-Block-All-Others" -Direction Outbound -Action Block -Enabled True -Profile Any

    Log-Message "Firewall rules created successfully."
}

# Main script execution
try {
    # Prompt for the list of allowed URLs
    $urlInput = Read-Host -Prompt "Enter a list of allowed websites separated by semicolons (e.g., www.example.com;www.google.com)"
    $allowedURLs = $urlInput -split ";"

    if ($allowedURLs.Count -eq 0) {
        Log-Message "Error: No URLs provided."
        throw "No URLs provided."
    }

    # Trim any whitespace around URLs
    $allowedURLs = $allowedURLs | ForEach-Object { $_.Trim() }

    # Create firewall rules
    Create-FirewallRules -allowedURLs $allowedURLs

    Log-Message "PCIPS-Init script executed successfully."
} catch {
    Log-Message "Script execution failed: $_"
}
