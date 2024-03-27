<script lang="ts">
	//@ts-nocheck
	import axios from 'axios';
	import { createQuery } from '@tanstack/svelte-query';

	// UI COMPONENTS
	import { Button, Input, Range } from 'flowbite-svelte';
	import IoIosPlay from 'svelte-icons/io/IoIosPlay.svelte';
	import IoIosAdd from 'svelte-icons/io/IoIosAdd.svelte';
	import IoIosClose from 'svelte-icons/io/IoIosClose.svelte';

	let queue: string[] = [];
	let announcementAudio = new Audio();
	let playbackVolume: number = 0.3;
	let search: string = '';
	let fileList: string[] = [];

	$: announcementAudio.volume = playbackVolume;

	const filePathRoot: string = '/audios/';
	const filesQuery = createQuery<string>({
		queryKey: ['audio-files'],
		queryFn: async () => await axios.get(`${filePathRoot}/MTA/files.txt`).then((r) => r.data)
	});

	const playAudio = (filePath: string) => {
		announcementAudio.src = `${filePath}`;
		announcementAudio.play();
	};

	const addToQueue = (fileName: string) => {
		queue = [...queue, fileName];
	};

	const playQueue = () => {
		let index = 0;

		playAudio(queue[index]);

		announcementAudio.addEventListener('ended', () => {
			index++;

			if (index < queue.length) {
				playAudio(queue[index]);
			}
		});
	};

	const processFileList = (file: string): string[] => {
		let files: string[] = [];
		let lines = file.split('\r\n');
		let currentDirectory: string = '';
		let audioPackRoot = lines[0].replace('FOLDER', '').trim();

		lines.forEach((line, index: number) => {
			if (index > 0 && index + 1 < lines.length) {
				if (line.startsWith('TOTAL') || line.startsWith('FOLDER')) {
					line = line.replace('TOTAL', '').replace('FOLDER', '').trim();

					if (line.endsWith('\\')) {
						currentDirectory = currentDirectory.substring(
							0,
							currentDirectory.length - (line.replace('\\', '/').length + 1)
						);
					} else currentDirectory += `${line}/`;
				} else if (line.startsWith('FILE')) {
					files.push(
						`${filePathRoot}${audioPackRoot}/${currentDirectory}${line.replace('FILE', '').trim()}`
					);
				}
			}
		});

		return files;
	};

	$: if ($filesQuery.isSuccess) fileList = processFileList($filesQuery.data);
</script>

<div class="h-full p-5">
	<div class="flex h-full gap-4">
		<div>
			<h4 class="font-bold">Audio fragments</h4>
			<div
				class="flex h-[95%] w-[300px] flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-100 p-1"
			>
				<Input bind:value="{search}" placeholder="Search..." />
				{#if $filesQuery.isLoading || $filesQuery.isFetching}
					<span>Loading...</span>
				{:else if $filesQuery.isSuccess}
					{#each fileList
						.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
						.sort() as file}
						<div class="flex items-center justify-between gap-2 rounded-lg bg-gray-700 p-1">
							<Button size="xs" on:click="{() => playAudio(`${file}`)}"
								><div class="size-[20px]"><IoIosPlay /></div></Button
							>
							<span class="align-middle">{file.split('/').pop().replace('.wav', '')}</span>
							<Button color="green" size="xs" on:click="{() => addToQueue(file)}"
								><div class="size-[20px]"><IoIosAdd /></div></Button
							>
						</div>
					{/each}
				{/if}
			</div>
		</div>
		<div class="flex h-full w-full flex-col">
			<div>
				<h4 class="font-bold">Message</h4>
				<div class="my-2 h-[100px] rounded-lg bg-white p-3">
					{#if queue.length > 0}
						{#each queue as file}
							<span class="mr-1 text-black">{file.split('/').pop().replace('.wav', '')}</span>
						{/each}
					{/if}
				</div>
				<div class="my-4 flex flex-col">
					<h4 class="my-2 font-bold">Playback volume: {(playbackVolume * 100).toFixed(0)}%</h4>
					<Range min="0" max="1" step="0.01" bind:value="{playbackVolume}" />
				</div>
				<Button on:click="{playQueue}" disabled="{queue.length === 0}"
					><div class="size-[20px]"><IoIosPlay /></div>
					Play Announcement</Button
				>
				<Button on:click="{() => (queue = [])}" disabled="{queue.length === 0}" outline
					><div class="size-[20px]"><IoIosClose /></div>
					Clear Queue</Button
				>
			</div>
		</div>
	</div>
</div>
