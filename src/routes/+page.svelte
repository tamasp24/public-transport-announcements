<script lang="ts">
	//@ts-nocheck
	import axios from 'axios';
	import { createQuery } from '@tanstack/svelte-query';
	import Crunker from 'crunker';

	// UI COMPONENTS
	import { Button, Input, Range, Select } from 'flowbite-svelte';
	import IoIosPlay from 'svelte-icons/io/IoIosPlay.svelte';
	import IoMdSquare from 'svelte-icons/io/IoMdSquare.svelte';
	import IoIosAdd from 'svelte-icons/io/IoIosAdd.svelte';
	import IoIosClose from 'svelte-icons/io/IoIosClose.svelte';
	import IoMdDownload from 'svelte-icons/io/IoMdDownload.svelte';
	import IoIosRepeat from 'svelte-icons/io/IoIosRepeat.svelte';
	import MdSubdirectoryArrowLeft from 'svelte-icons/md/MdSubdirectoryArrowLeft.svelte';

	type Pack = {
		name: string;
		files: string[];
	};

	let announcementPacks = [];
	let queue: string[] = [];
	let announcementAudio = new Audio();
	let previewAudio = new Audio();
	let playbackVolume: number = 0.3;
	let search: string = '';
	let fileList: string[] = [];
	let currentlyPlayingFile: string = '';
	let selectedPack: string = 'MTA';
	let selectedPhrase: string = '';
	let selectedInsertIndex: number | undefined = undefined;

	$: announcementAudio.volume = previewAudio.volume = playbackVolume;

	const filePathRoot: string = '/audios/';
	const filesQuery = createQuery<string>({
		queryKey: ['audio-files'],
		queryFn: async () => await axios.get(`${filePathRoot}/files.txt`).then((r) => r.data)
	});

	const playAudio = (filePath: string) => {
		announcementAudio.src = `${filePath}`;
		announcementAudio.play();
		currentlyPlayingFile = filePath;
	};

	const playPreview = (filePath: string) => {
		previewAudio.src = `${filePath}`;
		previewAudio.play();
	};

	const addToQueue = (fileName: string) => {
		queue = queue.toSpliced(selectedInsertIndex ?? queue.length, 0, fileName);
		selectedInsertIndex = undefined;
	};

	const clearQueue = () => {
		queue = [];
		selectedPhrase = '';
		selectedInsertIndex = undefined;
	};

	const playQueue = () => {
		let index = 0;

		playAudio(queue[index]);

		announcementAudio.onended = () => {
			index++;

			if (index < queue.length) {
				playAudio(queue[index]);
				return;
			}

			currentlyPlayingFile = '';
			announcementAudio.pause();
			announcementAudio.currentTime = 0;
		};
	};

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

		let packsNames = [...new Set(files.map((file) => file.split('/')[1]))];
		let packs = packsNames.map((pack) => {
			return {
				name: pack,
				files: files.filter((file) => file.split('/')[1] === pack)
			};
		});

		return packs;
	};

	const concatenateAudio = () => {
		let crunker = new Crunker();

		crunker
			.fetchAudio(...queue)
			.then((buffers) => crunker.concatAudio(buffers))
			.then((concatenated) => crunker.export(concatenated, 'audio/wav'))
			.then((output) => crunker.download(output.blob, 'announcement'))
			.catch((err) => {
				throw new Error(err);
			});
	};

	const stopPlayback = () => {
		announcementAudio.pause();
		announcementAudio.currentTime = 0;
		currentlyPlayingFile = '';
	};

	const replaceSelectedPhrase = (phrase: string) => {
		let index = queue.indexOf(selectedPhrase);

		if (~index) queue[index] = phrase;

		selectedPhrase = '';
	};

	const removeSelection = () => {
		selectedPhrase = '';
		selectedInsertIndex = undefined;
	};

	const deleteSelectedPhrase = () => {
		queue = queue.toSpliced(queue.indexOf(selectedPhrase), 1);
		selectedPhrase = '';
	};

	$: if ($filesQuery.isSuccess) announcementPacks = processFileList($filesQuery.data);
	$: if (announcementPacks.length > 0)
		fileList = announcementPacks.filter((p) => p.name === selectedPack)[0].files;
</script>

<div class="h-full p-5">
	<div class="flex h-full gap-16">
		<div>
			<h4 class="my-1 font-bold">Audio fragments</h4>
			<div
				class="flex h-[95%] w-[300px] flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-100 p-1"
			>
				<Select
					items="{announcementPacks.map((p) => ({ name: p.name, value: p.name }))}"
					bind:value="{selectedPack}"
				/>
				<Input class="sticky top-0" bind:value="{search}" placeholder="Search..." />
				{#if $filesQuery.isLoading || $filesQuery.isFetching}
					<span>Loading...</span>
				{:else if fileList.length > 0}
					{#each fileList.filter((f) => f.toLowerCase().includes(search.toLowerCase())) as file}
						<div class="flex items-center justify-between gap-2 rounded-lg bg-gray-700 p-1">
							<Button class="h-full" size="xs" on:click="{() => playPreview(`${file}`)}"
								><div class="size-[20px]"><IoIosPlay /></div></Button
							>
							<span class="text-center align-middle"
								>{file.split('/').pop().replace('.wav', '')}</span
							>
							{#if !selectedPhrase}
								<Button class="h-full" color="green" size="xs" on:click="{() => addToQueue(file)}"
									><div class="size-[20px]"><IoIosAdd /></div></Button
								>
							{:else if selectedPhrase}
								<Button
									class="h-full"
									color="green"
									size="xs"
									on:click="{replaceSelectedPhrase(file)}"
									><div class="size-[20px]"><IoIosRepeat /></div></Button
								>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
		<div class="flex h-full w-[70%] flex-col justify-between">
			<div>
				<h4 class="font-bold">Message</h4>
				<div class="my-2 flex h-[100px] flex-wrap rounded-lg bg-white p-3 text-black">
					{#if queue.length > 0}
						{#each queue as file, index}
							<!--svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
							{#if queue.length > 0 && announcementAudio.paused && index !== selectedInsertIndex}
								<div
									class="h-[25px] w-[10px] cursor-pointer hover:bg-gray-400"
									on:click="{() => (selectedInsertIndex = index)}"
								></div>
							{:else if index === selectedInsertIndex}
								<div
									class="flex h-[25px] w-[10px] cursor-pointer flex-col justify-center bg-amber-400"
								>
									<div class="size-[10px]">
										<MdSubdirectoryArrowLeft />
									</div>
								</div>
							{/if}
							<!--svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
							<span on:click="{() => (selectedPhrase = file)}" class="mx-1 cursor-pointer">
								{#if currentlyPlayingFile === file}
									<b class="bg-sky-300">{file.split('/').pop().replace('.wav', '')}</b>
								{:else if selectedPhrase === file}
									<b class="bg-orange-300">{file.split('/').pop().replace('.wav', '')}</b>
								{:else}
									{file.split('/').pop().replace('.wav', '')}
								{/if}
							</span>
						{/each}
					{:else}
						<i>The queue is empty.</i>
					{/if}
				</div>
				{#if selectedPhrase || selectedInsertIndex !== undefined}
					<Button color="red" on:click="{removeSelection}" outline>Remove Selection</Button>
					<Button color="red" on:click="{deleteSelectedPhrase}" disabled="{!selectedPhrase}"
						>Delete Selected Phrase</Button
					>
				{:else}
					<i>Click on a phrase to replace it.</i>
				{/if}
				<div class="my-4 flex flex-col">
					<h4 class="my-2 font-bold">Playback volume: {(playbackVolume * 100).toFixed(0)}%</h4>
					<Range min="0" max="1" step="0.01" bind:value="{playbackVolume}" />
				</div>
				{#if announcementAudio.paused}
					<Button on:click="{playQueue}" disabled="{queue.length === 0}"
						><div class="size-[20px]"><IoIosPlay /></div>
						Play Announcement</Button
					>
				{:else}
					<Button on:click="{stopPlayback}"
						><div class="size-[20px]"><IoMdSquare /></div>
						Stop Playback</Button
					>
				{/if}
				<Button
					color="red"
					on:click="{clearQueue}"
					disabled="{queue.length === 0 || !announcementAudio.paused}"
					outline
					><div class="size-[20px]"><IoIosClose /></div>
					Clear Queue</Button
				>
				<Button color="purple" on:click="{concatenateAudio}" disabled="{queue.length === 0}"
					><div class="size-[20px]"><IoMdDownload /></div>
					Merge & Save</Button
				>
			</div>
			<div>
				<h4 class="text-center">
					The MTA announcements are de-noised fragments from <a
						href="https://www.youtube.com/@MrRailfan"
						target="_blank">MrRailfan</a
					>'s videos. The Northern Line extension and Southeastern announcements were released under
					the FOI and are for personal use only.
				</h4>
			</div>
		</div>
	</div>
</div>
