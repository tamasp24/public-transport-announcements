import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import AutoImport from 'unplugin-auto-import/vite';
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

export default defineConfig({
	plugins: [sveltekit(), AutoImport({
		resolvers: [IconsResolver({
			prefix: 'Icon',
			extension: 'svelte'
		})]
	}), Icons({
		compiler: 'svelte'
	})]
});
