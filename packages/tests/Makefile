BUILD_DIR=dist

.PHONY: build clean client server test

build: $(BUILD_DIR)

clean:
	rm -rf $(BUILD_DIR) || true

client:
	cd ../client && make clean build

server:
	cd ../server && make clean build

test: build
	node --test $(BUILD_DIR)/*.js

$(BUILD_DIR): $(shell find src -name '*.ts')
	yarn tsc --outDir $(BUILD_DIR)
