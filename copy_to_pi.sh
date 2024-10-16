#! /usr/bin/zsh

cd $HOME/projects/pumpkin-pedestals
rsync -aR --progress \
    --exclude web/backend/.venv \
    --exclude web/backend/__pycache__ \
    common \
    web/backend \
    web/build \
    rytrose@10.0.0.62:/home/rytrose/projects/pumpkin-pedestals
    # ^ WSL doesn't seem to resolve rytrose-pi-zero-w.local so you may need to update this IP
