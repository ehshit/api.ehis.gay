export const openapiSpec = `openapi: 3.1.0
info:
  title: api.ehis.gay
  version: 0.1.0
  description: API for ehis.gay with stuff!
servers:
  - url: https://api.ehis.gay
tags:
  - name: boobs
    description: per-uuid over-limit config storage
  - name: Windows Package Manager
    description: Look up a package in the Windows Package Manager manifest
  - name: meta
    description: service health
paths:
  /v1/boobs/register:
    post:
      tags: [boobs]
      summary: opt in to boob sync
      description: registers your uuid and returns a token.
      operationId: registerBoobs
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [uuid]
              properties:
                uuid:
                  type: string
                  format: uuid
      responses:
        "201":
          description: registered
          content:
            application/json:
              schema:
                type: object
                properties:
                  uuid:
                    type: string
                    format: uuid
                  token:
                    type: string
        "429":
          description: too many registrations from this ip
  /v1/boobs:
    get:
      tags: [boobs]
      summary: fetch one or many player configs
      description: single lookup by uuid, or batch lookup of several uuids at once.
      operationId: getBoobs
      parameters:
        - name: uuid
          in: query
          schema:
            type: string
            format: uuid
        - name: multiple
          in: query
          description: comma-separated list of uuids (max 50). alias uuids also accepted.
          schema:
            type: string
      responses:
        "200":
          description: config(s)
          content:
            application/json:
              schema:
                type: object
                additionalProperties:
                  $ref: "#/components/schemas/BoobsConfig"
        "400":
          description: missing or invalid parameters
        "404":
          description: no config stored for that uuid
        "429":
          description: too many requests
    put:
      tags: [boobs]
      summary: upload your own config
      description: requires bearer token, hash-mismatched fields are replaced, matching ones are left alone.
      operationId: putBoobs
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              allOf:
                - $ref: "#/components/schemas/BoobsConfig"
                - type: object
                  required: [uuid]
                  properties:
                    uuid:
                      type: string
                      format: uuid
      responses:
        "200":
          description: stored
        "401":
          description: missing or invalid token
    delete:
      tags: [boobs]
      summary: opt out of boob sync
      description: |
        deletes your stored config, also available via the web page at /opt-out/boobs.
        pass the uuid as a query parameter and the token as a bearer token.
        no request body is used, some proxies drop bodies on DELETE.
      operationId: deleteBoobs
      security:
        - bearerAuth: []
      parameters:
        - name: uuid
          in: query
          required: true
          schema:
            type: string
            format: uuid
        - name: token
          in: query
          description: alternative to the bearer header, for when a url is easier
          schema:
            type: string
      responses:
        "200":
          description: deleted (or never existed)
        "400":
          description: missing or invalid uuid
        "401":
          description: missing or invalid token
  /v1/boobs/multiple:
    get:
      tags: [boobs]
      summary: batch fetch player configs
      description: same as ?uuids= on /v1/boobs, but its own path. max 50 uuids.
      operationId: getBoobsMultiple
      parameters:
        - name: uuids
          in: query
          required: true
          description: comma-separated list of uuids. aliases multiple and uuid also accepted.
          schema:
            type: string
      responses:
        "200":
          description: configs that exist
          content:
            application/json:
              schema:
                type: object
                additionalProperties:
                  $ref: "#/components/schemas/BoobsConfig"
        "400":
          description: missing or invalid parameters
        "429":
          description: too many requests
  /v1/winget:
    get:
      tags: [Windows Package Manager]
      summary: Look up a package in the Windows Package Manager manifest
      description: look up the package in the Windows Package Manager manifest, pass the package name for a package and a locale for a locale
      operationId: lookupWinget
      parameters:
        - name: package
          in: query
          required: true
          description: package identifier, or just the package name when publisher is passed separately
          schema:
            type: string
          examples:
            full:
              value: Microsoft.PowerToys
            split:
              value: PowerToys
        - name: publisher
          in: query
          description: publisher folder, skips the guessing
          schema:
            type: string
        - name: letter
          in: query
          description: manifests folder letter (0-9 or a-z). derived from the identifier when omitted.
          schema:
            type: string
        - name: version
          in: query
          description: pin a version instead of the newest one
          schema:
            type: string
        - name: locale
          in: query
          description: |
            which locale manifest to read, like en-US or fr-FR. defaults to en-US,
            and falls back to whatever locales exist. check availableLocales in the response.
          schema:
            type: string
          examples:
            english:
              value: en-US
            french:
              value: fr-FR
        - name: full
          in: query
          description: |
            give everything, including the parsed version, locale and installer manifests
            under \`full\`, and the untruncated description and release notes
          schema:
            type: boolean
      responses:
        "200":
          description: package found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WingetResult"
        "400":
          description: missing or invalid parameters
        "404":
          description: publisher, package or version not found
        "429":
          description: too many requests, or github rate limit hit
        "502":
          description: github did not answer properly
  /health:
    get:
      tags: [meta]
      summary: is it alive
      operationId: health
      responses:
        "200":
          description: alive
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    BoobsConfig:
      type: object
      properties:
        hash:
          type: string
          description: sha-256 of the value fields, used for cheap change detection
        bust_size:
          type: number
          format: float
        breasts_xOffset:
          type: number
          format: float
        breasts_yOffset:
          type: number
          format: float
        breasts_zOffset:
          type: number
          format: float
        breasts_cleavage:
          type: number
          format: float
        voice_pitch:
          type: number
          format: float
        bounce_multiplier:
          type: number
          format: float
        floppy_multiplier:
          type: number
          format: float
    WingetResult:
      type: object
      properties:
        letter:
          type: string
        publisher:
          type: string
        name:
          type: string
        identifier:
          type: string
        version:
          type: string
        latestVersion:
          type: string
        versionCount:
          type: integer
        locale:
          type: string
          nullable: true
          description: the locale manifest that was actually read
        availableLocales:
          type: array
          items:
            type: string
        manifestPath:
          type: string
        manifestUrl:
          type: string
          nullable: true
        manifestUrls:
          type: object
          properties:
            version:
              type: string
              nullable: true
            locale:
              type: string
              nullable: true
            installer:
              type: string
              nullable: true
        repoUrl:
          type: string
        details:
          $ref: "#/components/schemas/WingetDetails"
        full:
          type: object
          description: the parsed version, locale and installer manifests. only when full=1.
          additionalProperties: true
          properties:
            version:
              type: object
              additionalProperties: true
            locale:
              type: object
              additionalProperties: true
            installer:
              type: object
              additionalProperties: true
    WingetDetails:
      type: object
      additionalProperties: true
      properties:
        PackageIdentifier:
          type: string
        PackageVersion:
          type: string
        PackageLocale:
          type: string
        ManifestVersion:
          type: string
        PackageName:
          type: string
        Publisher:
          type: string
        PublisherUrl:
          type: string
        PublisherSupportUrl:
          type: string
        PrivacyUrl:
          type: string
        Author:
          type: string
        PackageUrl:
          type: string
        License:
          type: string
        LicenseUrl:
          type: string
        Copyright:
          type: string
        CopyrightUrl:
          type: string
        ShortDescription:
          type: string
        Description:
          type: string
        Moniker:
          type: string
        Tags:
          type: array
          items:
            type: string
        ReleaseNotes:
          type: string
        ReleaseNotesUrl:
          type: string
        InstallerType:
          type: string
        NestedInstallerType:
          type: string
        InstallerUrl:
          type: string
        InstallerSha256:
          type: string
        InstallerLocale:
          type: string
        Scope:
          type: string
        MinimumOSVersion:
          type: string
        UpgradeBehavior:
          type: string
        Commands:
          type: array
          items:
            type: string
        Protocols:
          type: array
          items:
            type: string
        FileExtensions:
          type: array
          items:
            type: string
        Installers:
          type: array
          items:
            type: object
            additionalProperties: true
            properties:
              Architecture:
                type: string
              InstallerType:
                type: string
              InstallerUrl:
                type: string
              Scope:
                type: string
              InstallerLocale:
                type: string
              MinimumOSVersion:
                type: string`;