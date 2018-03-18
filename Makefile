PATH := node_modules/.bin:$(PATH)

BROWSERIFY_OPTIONS := -t [ babelify --presets env ]

all: build/ui.js build/style.css

build/style.css: build style.scss
	#node-sass --source-map true ./style.scss ./build/style.css
	node-sass ./style.scss ./build/style.css

build/ui.js: build *.js network/*.js build/parser.js
	#browserify ./ui.js $(BROWSERIFY_OPTIONS) --debug | exorcist ./build/ui.js.map > ./build/ui.js
	browserify ./ui.js $(BROWSERIFY_OPTIONS) > ./build/ui.js

build/parser.js: build parser.pegjs
	pegjs -o ./build/parser.js ./parser.pegjs

build:
	mkdir build

clean:
	rm -rf build/

.PHONY: all clean
