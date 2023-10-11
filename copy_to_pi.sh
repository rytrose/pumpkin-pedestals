#! /usr/local/bin/zsh

cd $HOME/projects/pumpkin-pedestals
rsync -aR --progress \
    common \
    web/backend \
    web/build \
    rytrose@rytrose-pi-zero-w.local:/home/rytrose/projects/pumpkin-pedestals