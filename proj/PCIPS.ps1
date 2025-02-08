<#
.SYNOPSIS
    PCIPS: Parental Controls in PowerShell.

.DESCRIPTION
    This script applies or reverts proxy-based parental controls on Windows 10+ by modifying
    the user's Internet Settings in the registry. It supports both interactive usage and 
    parameterized invocation for automation.

.PARAMETER Action
    Specify the action: 'apply' to enable proxy settings (with allowed website exceptions)
    or 'revert' to disable proxy settings.

.PARAMETER ProxyServer
    The proxy server to use (default is '127.0.0.1:80').

.PARAMETER AllowedWebsites
    An array of websites to allow (i.e. bypass the proxy). If not provided when applying the
    parental controls, the script will prompt the user interactively.

.EXAMPLE
    .\PCIPS.ps1 -Action apply -ProxyServer "127.0.0.1:80" -AllowedWebsites "example.com", "another.com"

.EXAMPLE
    .\PCIPS.ps1 -Action revert
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("apply", "revert")]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$ProxyServer = "127.0.0.1:80",

    [Parameter(Mandatory = $false)]
    [string[]]$AllowedWebsites
)

#-----------------------------------------------------------------------
# Constant: Registry path for Internet settings.
#-----------------------------------------------------------------------
$InternetSettingsPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"

#-----------------------------------------------------------------------
# Add a .NET type to call the WinINet API (refreshes Internet settings).
#-----------------------------------------------------------------------
if (-not ([System.Management.Automation.PSTypeName]"NativeMethods").Type) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class NativeMethods {
    [DllImport("wininet.dll", SetLastError = true)]
    public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
}
"@ -ErrorAction Stop
}

#-----------------------------------------------------------------------
# Function: Refresh-InternetSettings
#-----------------------------------------------------------------------
function Refresh-InternetSettings {
    try {
        $INTERNET_OPTION_SETTINGS_CHANGED = 39
        $INTERNET_OPTION_REFRESH = 37
        [NativeMethods]::InternetSetOption([IntPtr]::Zero, $INTERNET_OPTION_SETTINGS_CHANGED, [IntPtr]::Zero, 0) | Out-Null
        [NativeMethods]::InternetSetOption([IntPtr]::Zero, $INTERNET_OPTION_REFRESH, [IntPtr]::Zero, 0) | Out-Null
    }
    catch {
        Write-Warning "Failed to refresh Internet settings: $_"
    }
}

#-----------------------------------------------------------------------
# Function: Get-WebsitesToAllow
#-----------------------------------------------------------------------
function Get-WebsitesToAllow {
    [CmdletBinding()]
    param()
    $websites = @()
    do {
        $inputWebsite = Read-Host "Enter a website to allow (or press Enter to finish)"
        if (-not [string]::IsNullOrWhiteSpace($inputWebsite)) {
            # Remove protocol and trailing slashes.
            $cleaned = $inputWebsite -replace '^(https?://)', '' -replace '/+$', ''
            # Prepend wildcard if not already present.
            if (-not $cleaned.StartsWith("*."))
            {
                $cleaned = "*.$cleaned"
            }
            $websites += $cleaned
        }
    } while (-not [string]::IsNullOrWhiteSpace($inputWebsite))
    return $websites
}

#-----------------------------------------------------------------------
# Helper Function: Test-PathProperty
#   Checks whether a property exists in a registry key.
#-----------------------------------------------------------------------
function Test-PathProperty {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )
    try {
        $item = Get-ItemProperty -Path $Path -ErrorAction Stop
        return $item.PSObject.Properties.Name -contains $Name
    }
    catch {
        return $false
    }
}

#-----------------------------------------------------------------------
# Function: Apply-ParentalControls
#   Enables the proxy with the specified allowed websites.
#-----------------------------------------------------------------------
function Apply-ParentalControls {
    [CmdletBinding()]
    param()
    try {
        # If AllowedWebsites is not provided or empty, prompt the user.
        if (-not $AllowedWebsites -or $AllowedWebsites.Count -eq 0) {
            $global:AllowedWebsites = Get-WebsitesToAllow
        }
        if ($AllowedWebsites.Count -eq 0) {
            Write-Error "No allowed websites provided. Aborting."
            return
        }

        Write-Verbose "Applying proxy settings. Allowed websites: $($AllowedWebsites -join ', ')"

        # Enable proxy.
        Set-ItemProperty -Path $InternetSettingsPath -Name ProxyEnable -Value 1 -ErrorAction Stop

        # Set the proxy server.
        Set-ItemProperty -Path $InternetSettingsPath -Name ProxyServer -Value $ProxyServer -ErrorAction Stop

        # Build and set the ProxyOverride string (includes local bypass).
        $proxyOverrideValue = "<local>;" + ($AllowedWebsites -join ";")
        Set-ItemProperty -Path $InternetSettingsPath -Name ProxyOverride -Value $proxyOverrideValue -ErrorAction Stop

        # Refresh the Internet settings.
        Refresh-InternetSettings

        Write-Host "Parental Controls have been applied successfully." -ForegroundColor Green
    }
    catch {
        Write-Error "Error applying parental controls: $_"
    }
}

#-----------------------------------------------------------------------
# Function: Revert-ParentalControls
#   Disables the proxy and removes custom proxy settings.
#-----------------------------------------------------------------------
function Revert-ParentalControls {
    [CmdletBinding()]
    param()
    try {
        Write-Verbose "Reverting proxy settings to defaults (disabled)."
        # Disable proxy.
        Set-ItemProperty -Path $InternetSettingsPath -Name ProxyEnable -Value 0 -ErrorAction Stop

        # Remove ProxyServer and ProxyOverride if they exist.
        if (Test-PathProperty -Path $InternetSettingsPath -Name ProxyServer) {
            Remove-ItemProperty -Path $InternetSettingsPath -Name ProxyServer -ErrorAction Stop
        }
        if (Test-PathProperty -Path $InternetSettingsPath -Name ProxyOverride) {
            Remove-ItemProperty -Path $InternetSettingsPath -Name ProxyOverride -ErrorAction Stop
        }

        # Refresh the Internet settings.
        Refresh-InternetSettings

        Write-Host "Parental Controls have been reverted successfully." -ForegroundColor Green
    }
    catch {
        Write-Error "Error reverting parental controls: $_"
    }
}

#-----------------------------------------------------------------------
# Main Execution
#-----------------------------------------------------------------------
switch ($Action) {
    "apply"  { Apply-ParentalControls }
    "revert" { Revert-ParentalControls }
    default  { Write-Error "Invalid Action specified. Use 'apply' or 'revert'." }
}

