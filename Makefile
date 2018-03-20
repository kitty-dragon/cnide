PATH := node_modules/.bin:$(PATH)

BROWSERIFY_OPTIONS := -t [ babelify --presets env ]

all: build/ui.js build/style.css

build/style.css: build style.scss
	#node-sass --source-map true ./style.scss ./build/style.css
	node-sass ./style.scss ./build/style.css

build/ui.js: build package.json *.js lib/*.js build/parser.js
	#browserify ./lib/ui.js $(BROWSERIFY_OPTIONS) --debug | exorcist ./build/ui.js.map > ./build/ui.js
	browserify ./lib/ui.js $(BROWSERIFY_OPTIONS) > ./build/ui.js

build/parser.js: build lib/parser.pegjs
	pegjs -o ./build/parser.js ./lib/parser.pegjs

build:
	mkdir build

test:
	mocha ./test/

clean:
	rm -rf build/

.PHONY: all clean test
