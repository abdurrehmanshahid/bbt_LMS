$ErrorActionPreference = 'Stop'

$checks = @(
  @{ Name = 'API'; Url = 'http://localhost:4000/api/tracks' },
  @{ Name = 'Web app'; Url = 'http://localhost:3000' }
)
$url = 'http://localhost:3000'
$deadline = (Get-Date).AddSeconds(90)

foreach ($check in $checks) {
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $check.Url -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "$($check.Name) is ready at $($check.Url)"
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if ((Get-Date) -ge $deadline) {
    throw "$($check.Name) did not become available at $($check.Url) within 90 seconds"
  }
}

try {
  Start-Process 'chrome.exe' $url
  Write-Host "Opened Chrome at $url"
} catch {
  Write-Host 'Chrome was not found on PATH; opening with the default browser instead.'
  Start-Process $url
}

<#
Fallback TCP check kept for environments where Invoke-WebRequest is blocked by local policy.
The primary check above uses real HTTP so it can catch cases where the port is open but the app is not ready.
#>
function Test-LocalPort {
  param([string] $HostName, [int] $Port)

  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $connect = $client.BeginConnect($HostName, $Port, $null, $null)
    if ($connect.AsyncWaitHandle.WaitOne(1000)) {
      $client.EndConnect($connect)
      $client.Dispose()
      return $true
    }
    $client.Dispose()
  } catch {
    return $false
  }

  return $false
}
