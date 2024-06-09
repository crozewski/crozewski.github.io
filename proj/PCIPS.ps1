# Function to prompt for websites to allow
function Get-WebsitesToAllow {
    $websites = @()
    while ($true) {
        $website = Read-Host "Enter a website to allow (or press Enter to finish)"
        if ([string]::IsNullOrEmpty($website)) {
            break
        }
        $websites += "*.$website"
    }
    return $websites
}

# Function to apply parental controls
function ApplyParentalControls {
    try {
        # Define proxy server settings
        $proxyServer = "127.0.0.1:80"
        $proxySetting = $proxyServer

        # Prompt user for websites to allow
        $exceptions = Get-WebsitesToAllow

        if ($exceptions.Count -eq 0) {
            Write-Host "No websites to allow were provided. Exiting script."
            exit
        }

        # Configure proxy settings in the registry
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyEnable -Value 1 -ErrorAction Stop
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyServer -Value $proxySetting -ErrorAction Stop
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyOverride -Value "<local>;${exceptions -join ';'}" -ErrorAction Stop

        # Refresh Internet Explorer settings to apply changes
        $ieSettings = New-Object -ComObject "Shell.Application"
        $ieSettings.NameSpace("Internet").InvokeVerb("Refresh")

        Write-Host "Parental Controls configured successfully."
    } catch {
        Write-Host "An error occurred: $_"
    }
}

# Function to revert parental controls
function RevertParentalControls {
    try {
        # Disable proxy settings in the registry
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyEnable -Value 0 -ErrorAction Stop
        Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyServer -ErrorAction Stop
        Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyOverride -ErrorAction Stop

        # Refresh Internet Explorer settings to apply changes
        $ieSettings = New-Object -ComObject "Shell.Application"
        $ieSettings.NameSpace("Internet").InvokeVerb("Refresh")

        Write-Host "Parental Controls have been reverted successfully."
    } catch {
        Write-Host "An error occurred while reverting settings: $_"
    }
}

# Main script logic
$action = Read-Host "Do you want to apply or revert parental controls? (Enter 'apply' or 'revert')"

if ($action -eq "apply") {
    ApplyParentalControls
} elseif ($action -eq "revert") {
    RevertParentalControls
} else {
    Write-Host "Invalid action specified. Please enter 'apply' or 'revert'."
}
