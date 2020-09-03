# Goal
This repository contains an implementation of TURTLEDOVE (https://github.com/WICG/turtledove). We aim to provide a solution that will be so similar to the final standard, that it could be a drop-in replacement of it. Until the proposal is implemented in browsers you can take advantage of this project to override proposed Navigator object's methods and use it the same way you would use the original TURTLEDOVE. As we can't modify browser code by itself, our implementation is based on existing technologies: _localStorage_ used by embedded _iframes_ and communicating with the main website by _postMessages_. This way all data is stored locally inside a browser and only the script serving domain has access to the private data.

Alongside the core code, we implemented a few sample websites. Everything is currently available on the Internet, so you can play with our demo without worrying about its deployment. The functionality of the core scripts is not limited to a few presented pages - everyone can write such a sample, one just needs some dummy ad network, an advertiser that will put that ad network in the `readers` field, and a publisher that is 'integrated' with the very same ad network.

# Usage
To use our implementation just import a file `turtledove.js` and call `initTurtledove`: 
```
import { initTurtledove } from "https://turtledove.pl/turtledove.js"

initTurtledove({ logs: true })
```

Initializing function consumes a config object which recognizes one key:
- `logs`- if set to `true`, adds a button to open a message log that gives a bit of insight into implementation internals.

Calling `initTurtledove` overwrites functions `window.navigator.renderAds`, `window.navigator.joinAdInterestGroup` and `window.navigator.leaveAdInterestGroup`, that in the future would be provided by a browser.

# Demo websites
As stated before our implementation consists not only of a core but also a few websites that are using it to render some ads.
All websites mentioned here are initializing TURTLEDOVE with parameter `logs` set to `true`, so on every page, there is a
small question mark with turtledove on it - after clicking there the console will open on the bottom of a screen. The whole logging idea is added only for visualization purposes - it is not a part of the TURTLEDOVE standard.

Besides reading logs you may find it helpful to open developer tools in the browser and peek at request flow.

## Turtledove server
This is the central part of the demo, hosted on the Internet at https://turtledove.pl. It serves a _turtledove.js_ file containing functions that in the future will be browser's API.
It also hosts addresses _/store_ and _/render-ad_ that are the source of iframes that are, respectively, saving ad interest groups or performing on-device auction of private ads.

The last function of the turtledove server is exposing a set of files to add a console with a log of TURTLEDOVE events, and a simple user interface available on the main page http://turtledove.pl (such a panel also will be a part of the browser in the future).

The important thing to remember is that the server by itself is **NOT** a part of TURTLEDOVE, which by definition is not related to any third-party servers. The whole point of the turtledove-server is just to host a few javascript files that later are performing all operations **locally in the browser**.

## Publishers

TURTLEDOVE ads can be seen in two example publishers:
- https://aboutplanes.pl - a publisher, that don't like ads about the other means of transport than planes
- https://aboutanimals.pl - a publisher on which ad-network values more ads about animals


## Advertisers
We wrote three web pages that are creating AdInterestGroups:
- https://sportequipment.pl - a shop which is performing naive retargeting by showing ads only for last viewed category.
- https://catordog.pl - an advertiser that asks you if you like cats or dogs and afterward shows you its ads promoting
either cat or dog food. If you didn't declare anything, it will show you a generic ad for its visitors. Quite the opposite,
if you click on an ad and then buy food, then you will see higher valued ads for food buyers.
- https://trainorplane.pl - an advertiser that just asks you about your locomotion preferences and then shows you related ads.

## Ad network
This part is a dummy company that serves ads. It contains some hardcoded data to customize responses for publishers and advertisers from this sample.
The interface between _turtledove.js_ and ad network have to be rigid and to allow easy implementation of new ad networks is published in a separate `turtledove-js-api` npm package.
On the other hand an interface between publishers and the ad network is completely arbitrary and is not an element of TURTLEDOVE specification. Our ad network is available at address https://ad-network.pl

# Sample testing scenario
1. If you already entered on any website in this demo, go to https://turtledove.pl and clear your data.
2. Enter https://aboutplanes.pl and see contextual ads (you were not added to any group yet). To get the better insight you can also open a console by clicking on a question mark with a turtledove on it in the top-right corner and read what just happened.
3. Go to the https://sportequipment.pl and check out bikes page.
4. Check both https://aboutplanes.pl and https://aboutanimals.pl. The bike-related ad will not show on a website about planes. You can go now to https://turtledove.pl and check the bidding function of the ad for bikes_viewer and context signals of auctions that were performed on both websites - that will explain why winners differ in both auctions.
5. Go to the https://sportequipment.pl and this time list rollerblades.
6. Check both https://aboutplanes.pl and https://aboutanimals.pl. Now rollerblades ad should be everywhere (excluding the best context spot on the right side of aboutplanes.pl), as it is quite valuable and not denied on any site.
7. Go to the https://turtledove.pl and check out that the bikes ad was removed when rollerblades ad appeared.
8. Go to https://catordog.pl and select the kind of pets that you like.
9. Once again see both https://aboutplanes.pl and https://aboutanimals.pl. This time animals-related ads should be shown at aboutanimals.pl, as they are the best fit for the site topic.
10. Assume you don't like an ad for cat/dog lovers. Hover over a small question mark at the top of an ad iframe, read the description, and remove this ad. Refresh a website to check if it vanished indeed.

# Open issues / comments
- This simulation is a continuously developed **unofficial** prototype. It is not the reference implementation, we just built that to get a better understanding of how future changes will affect the advertising business.
- The base of our demo is localStorage. We use that because it's what we have access to. Maybe in the future, it will not be available but hopefully, at the same time, proper TURTLEDOVE will be. **Users who have disabled localStorage in the browser will not be able to use this demo.**
- We are fetching ads exactly in the time joining AdInterestGroup. It will not be the case in TURTLEDOVE, but for our demo, it's very handy simplification.
- Our iframes are just plain old-school iframes versus fancy fenced iframes that probably will be used in final implementation (see https://github.com/shivanigithub/fenced-frame)
- We have no aggregated reporting. Or rather no reporting at all. It is out of scope of this demo, at least for now.
- Both publisher and advertiser have to specify the same ad network. A collaboration of ad networks is a big topic and is not clarified at all in the proposal itself yet.
- Context bids are forcefully fitted into the same rendering regime as behavioral ads - this was not specified in original TURTLEDOVE, but it has certainly its advantages and probably will be a subject of ongoing discussions.
- Our `renderAds`, in contrast to proposed `renderInterestGroupAd`, supports multiple ad networks in a single auction.
- Ad network responses differ from described in the proposal. However, its only consumer is our demo which differs significantly in the internal details from the final TURTLEDOVE anyway.
- Interest group membership timeout is not implemented

# Launch
As stated before, all of those samples are running live under the provided addresses - however, if you'd like to, you can experiment with the code on your own and run these samples locally. You have two basic ways to do this.

## With node 14
Just go to the folder with the repository and run:
```
npm install
npm start
```
Note, that you'll need version 14 of node.js to be able to run this app.

## With docker
If you don't want to bother with node.js, you can just build a docker image and run it:
```
docker build -t td-demo .
docker run -ti -p 8000-8008:8000-8008 td-demo
```
