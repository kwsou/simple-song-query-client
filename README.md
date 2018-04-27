# simple-song-query-client
Simple program that periodically polls the [query server](https://github.com/kwsou/simple-song-query-server) to retrieve the currently playing song from various services (i.e. spotify, youtube). Writes the currently playing track name, album name, and album image to individual files.

If you already have a compiled build of this and do not want to rebuild from source yourself, just skip down to the section on running and configuring this program.

## Setup Steps (dev)
* Obtain a copy of the source
* Open a terminal and `cd` into the source
* Run `npm install` to obtain node dependencies
* Configure the `config.ini` file to match your preferences. Go down to the section about configuration
* To run the server, run `node simple-song-query-client.js`

## Build (dev)
If you want to compile the source yourself to form a standalone exe, do the following:
* Install grunt by running `npm install -g grunt`
* Grunt tasks are setup already without needing you to configure anything. Build the project by running `grunt`
* Once the task finishes, you can find the packaged project under `.\build`
* Build the project by running `grunt`

## Configuration
You can find the configuration file under `config.ini`. Here is the currently supported settings:

* Poll settings
  * PLAYER: which player to check updates for. Currently only supports Spotify=0.
  * UPDATE_TIME: the time to wait between polls in ms.
* Spotify settings
  * USERNAME: your spotify username. If you're not sure, [here](https://community.spotify.com/t5/Accounts/Forgot-Username/m-p/1353313#M201979) explains how you can find out.
  * POLL_URL: the service endpoint to hit to poll for currently playing spotify song
* File settings
  * SAVE_TRACK_NAME: whether or not to write to file about track name. Either set as `true` or `false`
  * SAVE_ALBUM_NAME: whether or not tp wrote to file about album name. Either set as `true` or `false`
  * SAVE_ALBUM_IMAGE: whether or not tp wrote to file about album image. Either set as `true` or `false`
  
Below is an example configuration:
```
[poll]
PLAYER = 0
UPDATE_TIME = 1500

[spotify]
USERNAME = 1273003771
POLL_URL = http://kam-sb.ddns.net:8888/spotify/current-song

[file]
SAVE_TRACK_NAME = true
SAVE_ALBUM_NAME = true
SAVE_ALBUM_IMAGE = true
```

## Running as executable
If you already have the compiled build, when you unzip the build, you should see `simple-song-query-client.exe`. Simply running that will work. The files written are located inside `./output`. If you wish to check the output, there is also a logs located under `./logs`.
