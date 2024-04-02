SRC_DIR=src
BUILD_DIR=dist
GENERATED_SRC_DIR=$(SRC_DIR)/generated
OPENAPI_JSON=../openapi-spec/dist/openapi.json

.PHONY: build clean generate spec

build: $(BUILD_DIR)

clean:
	rm -rf $(GENERATED_SRC_DIR) || true

generate: $(GENERATED_SRC_DIR)

spec:
	cd ../openapi-spec && make clean build

$(OPENAPI_JSON):
	cd ../openapi-spec && make

$(BUILD_DIR): $(GENERATED_SRC_DIR) $(shell find $(SRC_DIR) -name "*.ts")
	yarn tsc --outDir $(BUILD_DIR)

$(GENERATED_SRC_DIR):$(OPENAPI_JSON) node_modules
	yarn openapi-generator-cli generate \
		-i $(OPENAPI_JSON) \
		-o $(GENERATED_SRC_DIR) \
		-g typescript-fetch \
		--additional-properties=supportsES6=true,typescriptThreePlus=true,importFileExtension=.js


node_modules:
	yarn && touch $@

