UUID := hidden-tray@diogocouto18.github.io
ZIP := dist/$(UUID).shell-extension.zip

.PHONY: test lint schemas pack install

test:
	node --test tests/

lint:
	npx eslint .

schemas:
	glib-compile-schemas extension/schemas

pack: schemas
	mkdir -p dist
	gnome-extensions pack extension --extra-source=lib --force -o dist

install: pack
	gnome-extensions install --force $(ZIP)
