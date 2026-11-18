UUID := hidden-tray@diogocouto18.github.io
ZIP := dist/$(UUID).shell-extension.zip

.PHONY: test lint schemas pack install

test:
	node --test tests/

lint:
	npx eslint .

schemas:
	glib-compile-schemas extension/schemas

pack:
	./scripts/pack.sh

install: pack
	gnome-extensions install --force $(ZIP)
