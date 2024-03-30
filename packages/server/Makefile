.PHONY: build clean

BUILD_DIR=dist

build: $(BUILD_DIR)

clean:
	rm -rf $(BUILD_DIR) || true

$(BUILD_DIR): node_modules $(shell find src -name "*.ts")
	(rm -rf $(BUILD_DIR) || true) && yarn tsc --outDir $(BUILD_DIR)/

node_modules: package.json
	yarn && touch $@
