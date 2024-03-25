.PHONY: build build_server clean

build: build_server

build_server: node_modules
	cd packages/server && yarn build

clean:
	rm -rf dist

node_modules: package.json yarn.lock
	yarn && touch $@
