# Browser-based live P1 monitoring

1. Get a Raspberry Pi
1. Get Docker onto it
1. Connect your Pi with a P1 cable to your Smart Meter
1. Run the script below (correct your variables, and set the correct value for `--device`). If you don't define `WSS_URL` an emulator will start on `http://localhost:3000`. You can set `WSS_URL` to `ws://<ip>:<port>` too.
1. Visit the page on `http://127.0.0.1:3000`. Switch the bound port in the Docker command otherwise.
 
```
trap "rm -Rf p1-ws" ERR
trap "rm -Rf p1-ws" EXIT
cd p1-ws
docker build --network=host --tag=p1-ws .
cd -

docker run \
  --name=p1-ws \
  -e PUID=$(id -u) \
  -e PGID=$(id -g) \
  -e "WSS_URL=wss://power.rogierslag.nl" \
  -p 127.0.0.1:3003:3000 \
  -d \
  --rm \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  p1-ws
```

Sometimes the container will not receive any updates.
This seems to be a Docker bug.
Just stop the container `docker stop p1-ws` and re-run the script generally "fixes" it.
