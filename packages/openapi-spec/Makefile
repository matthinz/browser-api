SRC_DIR=src
BUILD_DIR=dist
SPEC_FILE=$(BUILD_DIR)/openapi.yml

BUILD_SCRIPT=$(BUILD_DIR)/build-openapi-yaml.js

build: $(SPEC_FILE)

clean:
	rm -rf $(BUILD_DIR) || true

$(SPEC_FILE): $(BUILD_SCRIPT)
	node $(BUILD_SCRIPT) $(BUILD_DIR)

$(BUILD_SCRIPT): $(shell find $(SRC_DIR) -name "*.ts")
	(rm -rf $(BUILD_DIR) || true) && yarn tsc --outDir $(BUILD_DIR)
