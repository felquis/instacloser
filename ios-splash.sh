#!/bin/bash
# Generate PhoneGap icon and splash screens.
# Copyright 2013 Tom Vincent <http://tlvince.com/contact>

usage() { echo "usage: $0 icon colour [dest_dir]"; exit 1; }

[ "$1" ] && [ "$2" ] || usage
[ "$3" ] || set "$1" "$2" "."

devices=android,ios,ios-test
eval mkdir -p "$3/res/{icon,screen}/{$devices}"

# Show the user some progress by outputing all commands being run.
set -x

background=${1-transparent}

convert="convert $1 -background $background -gravity center"

# -resize 300x300 -extent 600x600 icon128-new.png

$convert -resize 272x272 -extent 320x480 "$3/res/screen/ios-test/Default~iphone.png"
$convert -resize 548x548 -extent 640x960 "$3/res/screen/ios-test/Default@2x~iphone.png"
$convert -resize 666x666 -extent 768x1024 "$3/res/screen/ios-test/Default-Portrait~ipad.png"
$convert -resize 666x666 -extent 2024x768 "$3/res/screen/ios-test/Default-Landscape~ipad.png"
$convert -resize 1334x1334 -extent 1536x2048 "$3/res/screen/ios-test/Default-Portrait@2x~ipad.png"
$convert -resize 1334x1334 -extent 2048x1536 "$3/res/screen/ios-test/Default-Landscape@2x~ipad.png"

$convert -resize 666x666 -extent 1280x720 "$3/res/screen/android/screen-xhdpi-landscape.png"
$convert -resize 666x666 -extent 720x1280 "$3/res/screen/android/screen-xhdpi-portrait.png"

$convert -resize 272x272 -extent 320x480 "$3/res/screen/android/screen-mdpi-portrait.png"
$convert -resize 272x272 -extent 480x320 "$3/res/screen/android/screen-mdpi-landscape.png"

$convert -resize 150x150 -extent 320x200 "$3/res/screen/android/screen-ldpi-landscape.png"
$convert -resize 150x150 -extent 200x320 "$3/res/screen/android/screen-ldpi-portrait.png"

$convert -resize 390x390 -extent 480x800 "$3/res/screen/android/screen-hdpi-portrait.png"
$convert -resize 390x390 -extent 800x480 "$3/res/screen/android/screen-hdpi-landscape.png"


# $convert -resize 128x128 -extent 2024x768^ "$3/res/screen/ios-test/Default-Landscape~ipad.png"
# $convert -resize 128x128 -extent 2048x1536^ "$3/res/screen/ios-test/Default-Landscape@2x~ipad.png"
# $convert -resize 128x128 -extent 1536x2048^ "$3/res/screen/ios-test/Default-Portrait@2x~ipad.png"
# $convert -resize 128x128 -extent 768x1024^ "$3/res/screen/ios-test/Default-Portrait~ipad.png"
# $convert -resize 548x548 -extent 640x960 "$3/res/screen/ios-test/Default@2x~iphone.png"
# $convert -resize 272x272 -extent 320x480 "$3/res/screen/ios-test/Default~iphone.png"
