SRC_DIR=src
GENERATED_SRC_DIR=$(SRC_DIR)/generated
OPENAPI_YML=../browser-api-openapi-spec/dist/openapi.yml

build: generate

clean:
	rm -rf $(GENERATED_SRC_DIR) || true

generate: $(OPENAPI_YML) node_modules
	yarn openapi-generator-cli generate \
		-i $(OPENAPI_YML) \
		-o $(GENERATED_SRC_DIR) \
		-g typescript-fetch \
		--additional-properties=supportsES6=true,typescriptThreePlus=true

$(OPENAPI_YML):
	cd ../openapi-spec && make

node_modules:
	yarn && touch $@

