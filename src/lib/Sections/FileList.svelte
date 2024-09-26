<script lang="ts">
	import axios from 'axios';
	import { createQuery } from '@tanstack/svelte-query';

	// UI COMPONENTS
	import { Button, Input, Select } from 'flowbite-svelte';

	// ICONS REFERENCE: https://icones.js.org/collection/ion
	import IoIosPlay from '~icons/ion/ios-play';
	import IoIosRepeat from '~icons/ion/ios-repeat';
	import IoIosAdd from '~icons/ion/ios-add';

	import type { Pack } from '$lib/types';

	type Props = {
		volume: number;
		queue: string[];
		filePathRoot: string;
		selectedPhraseIndex: number | undefined;
		selectedInsertIndex: number | undefined;
	};

	let {
		queue = $bindable([]),
		volume = $bindable(),
		filePathRoot,
		selectedPhraseIndex = $bindable(),
		selectedInsertIndex = $bindable()
	}: Props = $props();

	const filesQuery = createQuery<string>({
		queryKey: ['audio-files'],
		queryFn: async () => await axios.get(`${filePathRoot}/files.txt`).then((r) => r.data)
	});
	let previewAudio = new Audio();
	let search: string = $state('');
	let selectedPack: string = $state('MTA');
	let announcementPacks = $derived.by(() => {
		if ($filesQuery.isSuccess) return processFileList($filesQuery.data);
		else return [];
	});
	let fileList: string[] = $derived.by(() => {
		if (announcementPacks.length > 0) {
			return announcementPacks.filter((p) => p.name === selectedPack)[0].files;
		} else return [];
	});
	const fileListFilteredBySearchField: string[] = $derived(
		fileList.filter((f) => f.toLowerCase().includes(search.toLowerCase())).sort()
	);

	$effect(() => {
		previewAudio.volume = volume;
	});

	/* INSERT PHRASE AT SELECTED INDEX IF A PHRASE HAS BEEN CLICKED ON,
	OTHERWISE APPEND IT TO THE END */
	const addToQueue = (fileName: string) => {
		queue = queue.toSpliced(selectedInsertIndex ?? queue.length, 0, fileName);
		selectedInsertIndex = undefined;
	};

	const playPreview = (filePath: string) => {
		previewAudio.src = filePath;
		previewAudio.play();
	};

	/*	PROCESS FILE LIST INTO PACKS
		FILE LIST EXPORTED VIA KAREN'S DIRECTORY PRINTER:
			- SELECT 'AUDIOS' FOLDER
			- SAVE OPTIONS: BOTH FILES & FOLDERS; TICK ALL 4 BOXES BELOW; OMIT COMMENT LINES; FILE INFO: FILE NAME ONLY
		SCAN EACH LINE, CHECK IF LINE STARTS WITH 'FOLDER', 'TOTAL' OR 'FILE'
		- IF 'TOTAL' OR 'FOLDER': APPEND DIRECTORY NAME TO CURRENT PATH
		- IF ABOVE CONDITION AND LAST CHAR IS BACKSLASH: SUBTRACT IT FROM CURRENT PATH (= GOING UP ONE FOLDER)
		- IF 'FILE': APPEND FILE NAME TO CURRENT PATH AND PUSH TO ARRAY
	*/
	const processFileList = (file: string): Pack[] => {
		let files: string[] = [];
		let lines = file.split('\r\n');
		let currentDirectory: string = '';

		lines.forEach((line, index: number) => {
			let audioPackRoot = lines[0].replace('FOLDER', '').trim();

			if (line.startsWith('TOTAL') || line.startsWith('FOLDER')) {
				line = line.replace('TOTAL', '').replace('FOLDER', '').trim();

				if (line.endsWith('\\')) {
					currentDirectory = currentDirectory.substring(0, currentDirectory.length - line.length);
				} else currentDirectory += `${line}/`;
			} else if (line.startsWith('FILE')) {
				files.push(`${currentDirectory}${line.replace('FILE', '').trim()}`);
			}
		});

		/*	ORGANISE FILES INTO PACKS
			PACK NAMES ARE DERIVED FROM THE FOLDER NAMES INSIDE 'AUDIOS'
		*/
		let packsNames = [...new Set(files.map((file) => file.split('/')[1]))];
		let packs = packsNames.map((pack) => {
			return {
				name: pack,
				files: files.filter((file) => file.split('/')[1] === pack)
			};
		});

		return packs;
	};

	const replaceSelectedPhrase = (phraseToReplaceWith: string) => {
		queue[selectedPhraseIndex as number] = phraseToReplaceWith;

		selectedPhraseIndex = undefined;
	};
</script>

<div>
	<h4 class="my-1 font-bold">Audio fragments</h4>
	<div
		class="flex h-[95%] w-[300px] flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-100 p-1"
	>
		<Select
			items={announcementPacks.map((p) => ({
				name: `${p.name} (${p.files.length} phrases)`,
				value: p.name
			}))}
			bind:value={selectedPack}
		/>
		<Input type="text" class="sticky top-0" bind:value={search} placeholder="Search..." />
		{#if $filesQuery.isFetching}
			<span>Loading...</span>
		{:else if fileListFilteredBySearchField.length > 0}
			{#each fileListFilteredBySearchField as file}
				{@const fileName = file.split('/').pop()?.replace('.wav', '')}
				{@const directParentDir = file.split('/').slice(-2)[0]}
				<div class="flex items-center justify-between gap-2 rounded-lg bg-gray-700 p-1">
					<Button class="h-full" size="xs" onclick={() => playPreview(`${file}`)}>
						<div class="text-[20px]"><IoIosPlay /></div>
					</Button>
					<div class="flex flex-col text-center align-middle">
						<span>{fileName}</span>
						<small>{directParentDir}</small>
					</div>
					{#if selectedPhraseIndex === undefined}
						<Button class="h-full" color="green" size="xs" onclick={() => addToQueue(file)}>
							<div class="text-[20px]"><IoIosAdd /></div>
						</Button>
					{:else}
						<Button
							class="h-full"
							color="green"
							size="xs"
							onclick={() => replaceSelectedPhrase(file)}
						>
							<div class="text-[20px]"><IoIosRepeat /></div>
						</Button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>
