# api.ehis.gay
Repo of the ehis.gay's api that includes stuff!

Some are free to use and some require authentication

[View the API documentation](https://api.ehis.gay)

Or if you want you can host it yourself

## Docker

```
docker pull ghcr.io/ehshit/api.ehis.gay:latest
docker run -p 3000:3000 ghcr.io/ehshit/api.ehis.gay:latest
```

## Binaries

from the [latest release](https://github.com/ehshit/api.ehis.gay/releases/latest):

| System | Download |
| --- | --- |
| Windows x64 | [Download](https://github.com/ehshit/api.ehis.gay/releases/latest/download/api-ehis-gay-windows-x64.exe) |
| Linux x64 | [Download](https://github.com/ehshit/api.ehis.gay/releases/latest/download/api-ehis-gay-linux-x64) |
| macOS ARM64 (Apple Silicon) | [Download](https://github.com/ehshit/api.ehis.gay/releases/latest/download/api-ehis-gay-macos-arm64) |
| macOS Intel | [Download](https://github.com/ehshit/api.ehis.gay/releases/latest/download/api-ehis-gay-macos-x64) |

linux/macos: You might need to run `chmod +x` to the app before you can run it

MacOS is NOT signed, if MacOS doesn't let you open, allow it from System Settings --> Privacy & Security, or if this still not opening whitelist it from the quaratine on the terminal with:

- `xattr -dr com.apple.quarantine api-ehis-gay-macos-arm64` (Apple Silicon)
- `xattr -dr com.apple.quarantine api-ehis-gay-macos-x64` (Intel)

## From source

```
git clone https://github.com/ehshit/api.ehis.gay.git
cd api.ehis.gay
npm install
npm run dev
```