# Changelog

All notable changes to this project will be documented in this file. This should be updated in each individual branch as checked as part of the PR to ensure that it is kept up to date.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spc/v2.0.0.html).

Write your changes below this section. `npm version [major|minor|patch]` will automatically update changelog

## [Unreleased]

### FIXED

- fantom masking

### ADD

- Masking

## [2.0.9] - 2022-02-09

### Fixed

- pass RequestInit down to `fetchJson` allowing for the auth headers
- fix #4(in MapBox)
- DeckGL v8.6.8

## [2.0.8] - 2021-11-28

### Fixed

- install all required peer dependencies of `@deck.gl/core`
- version package-lock.json

## [2.0.7] - 2021-10-29

### ADD

- export WxGetColorStyles
- Freezed: units, colorSchemes, colorStylesUnrolled

## [2.0.6] - 2021-10-29

### ADD

- export Legend, createLegend

## [2.0.5] - 2021-10-18

### FIXED

- copy css to root (@metoceanapi/wxtiles-deckgl/wxtilescss.css)
- dependencies cleanup

## [2.0.3] - 2021-10-14

### FIXED

- layers didn not appear onViewportLoad (setTimeout trick is used)
- deleted peerDependencies

### ADDED

- more type exports
- visible first time appearing

## [2.0.2] - 2021-10-13

### FIXED

- externals dependencies

## [2.0.1] - 2021-10-12

### ADDED

- deck.gl 8.6.0

## [2.0.0] - 2021-10-12

### Added

- WxTiles for Deck.gl
- WxTilesLayerManager
- emty tiles cache
- boundaries check
- All the existing functionality (no change log)
