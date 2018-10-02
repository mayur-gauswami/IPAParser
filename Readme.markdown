# IPAParser

A basic tool to analyse IPA file. It's give you size analysis and files analysis like number of images, storyboards and nibs etc.

## Install
install dependencies:
``` bash
npm install
```
## Usage
First put your ipa files in project's "ipa" folder.
##### 1. IPA analysis
``` bash
node ipaParser.js ipa/Twitter.ipa
```

This will gets size analysis for given ipa file: 
- In terms of number of frameworks, extensions etc.

<img src="screenshots/sc-1.png" alt="Screenshot 1">

also it will give file analysis: 
- number of images & svgs in bundle, frameworks, assets catalogue etc.
- number of nibs, storyboards

<img src="screenshots/sc-2.png" alt="Screenshot 2">

##### 2. Compare IPA files

``` bash
node ipaParser.js ipa/<new_ipa_name>.ipa ipa/<old_ipa_name>.ipa
```
This will give information as mentioned above, additionally it will show newly added frameworks in latest version of ipa compare to old one.

<img src="screenshots/sc-3.png" alt="Screenshot 3">

## Example

Open up the included node project for an example app.
