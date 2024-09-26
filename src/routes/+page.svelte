<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import axios from 'axios';
	import Crunker from 'crunker';
	// UI COMPONENTS
	import { Button, Range } from 'flowbite-svelte';
	// ICONS REFERENCE: https://icones.js.org/collection/ion
	import IoIosClose from '~icons/ion/ios-close';
	import IoIosPlay from '~icons/ion/ios-play';
	import MdSubdirectoryArrowLeft from '~icons/ion/ios-return-left';
	import IoMdDownload from '~icons/ion/md-download';
	import IoMdSquare from '~icons/ion/md-square';

	import type { Programme } from '$lib/types';
	// SECTIONS
	import FileList from '$lib/Sections/FileList.svelte';
	import Programmes from '$lib/Sections/Programmes.svelte';

	const filePathRoot: string = '/audios/';
	const programmesQuery = createQuery<string>({
		queryKey: ['programmes'],
		queryFn: async () => await axios.get(`${filePathRoot}/Programmes.csv`).then((r) => r.data)
	});
	let queue: string[] = $state([]);
	let programmeQueue: string[] = $state([]);
	let playbackType: 'normal' | 'programme' = $state('normal');
	let announcementAudio = new Audio();
	let playbackVolume: number = $state(0.3);
	let currentlyPlayingFile: string = $state('');
	let selectedPhrase: string = $state('');
	let selectedInsertIndex: number | undefined = $state(undefined);

	$effect(() => {
		/* ANNOUNCEMENT AND PREVIEW AUDIO VARS ARE THE SAME BUT ARE KEPT SEPARATE
		FOR EASIER FUTURE MANAGEMENT */
		announcementAudio.volume = playbackVolume;
	});

	/* INSERT PHRASE AT SELECTED INDEX IF A PHRASE HAS BEEN CLICKED ON,
	OTHERWISE APPEND IT TO THE END */
	const addToQueue = (fileName: string) => {
		queue = queue.toSpliced(selectedInsertIndex ?? queue.length, 0, fileName);
		selectedInsertIndex = undefined;
	};

	const playAudio = (filePath: string) => {
		announcementAudio.src = `${filePath}`;
		announcementAudio.play();
		currentlyPlayingFile = filePath;
	};

	const clearQueue = () => {
		queue = [];
		selectedPhrase = '';
		selectedInsertIndex = undefined;
	};

	const playQueue = () => {
		playbackType = 'normal';
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

	const playProgrammeQueueHandler = (programmeStations: Programme[]) => {
		playbackType = 'programme';
		let index = 0;

		playAudio(`${filePathRoot}/${programmeStations[0].Root}/${programmeQueue[index]}.wav`);

		announcementAudio.onended = () => {
			index++;

			if (index < programmeQueue.length) {
				playAudio(`${filePathRoot}/${programmeStations[0].Root}/${programmeQueue[index]}.wav`);
				return;
			}

			currentlyPlayingFile = '';
			announcementAudio.pause();
			announcementAudio.currentTime = 0;
		};
	};
</script>

<div class="h-full p-5">
	<div class="flex h-full gap-16">
		<FileList
			bind:volume={playbackVolume}
			bind:selectedPhrase
			{filePathRoot}
			onAddToQueue={addToQueue}
			onReplaceSelectedPhrase={replaceSelectedPhrase}
		/>
		<div
			class="flex h-full w-full flex-col justify-between overflow-y-auto overflow-x-hidden pl-1 pr-7"
		>
			<div>
				<h4 class="font-bold">Message</h4>
				<div class="my-2 flex h-[100px] flex-wrap rounded-lg bg-white p-3 text-black">
					{#if queue.length > 0}
						{#each queue as file, index}
							{@const fileName = file.split('/').pop()?.replace('.wav', '')}
							{#if queue.length > 0 && announcementAudio.paused && index !== selectedInsertIndex}
								<div
									class="h-[25px] w-[10px] cursor-pointer hover:bg-gray-400"
									onclick={() => (selectedInsertIndex = index)}
								></div>
							{:else if index === selectedInsertIndex}
								<div
									class="flex h-[25px] w-[10px] cursor-pointer flex-col justify-center bg-amber-400"
								>
									<div class="text-[10px]">
										<MdSubdirectoryArrowLeft />
									</div>
								</div>
							{/if}
							<span onclick={() => (selectedPhrase = file)} class="mx-1 cursor-pointer">
								{#if currentlyPlayingFile === file}
									<b class="bg-sky-300">{fileName}</b>
								{:else if selectedPhrase === file}
									<b class="bg-orange-300">{fileName}</b>
								{:else}
									{fileName}
								{/if}
							</span>
						{/each}
					{:else}
						<i>The queue is empty.</i>
					{/if}
				</div>
				{#if selectedPhrase || selectedInsertIndex !== undefined}
					<Button color="red" on:click={removeSelection} outline>Deselect</Button>
					<Button color="red" on:click={deleteSelectedPhrase} disabled={!selectedPhrase}>
						Remove Selected Phrase
					</Button>
				{:else}
					<i>Click on a phrase to replace it.</i>
				{/if}
				<div class="my-4 flex flex-col">
					<h4 class="my-2 font-bold">Playback volume: {(playbackVolume * 100).toFixed(0)}%</h4>
					<Range min="0" max="1" step="0.01" bind:value={playbackVolume} />
				</div>
				{#if !currentlyPlayingFile || announcementAudio.paused}
					<Button on:click={playQueue} disabled={queue.length === 0}>
						<div class="text-[20px]"><IoIosPlay /></div>
						Play Announcement
					</Button>
				{:else}
					<Button on:click={stopPlayback}>
						<div class="text-[20px]"><IoMdSquare /></div>
						Stop Playback
					</Button>
				{/if}
				<Button
					color="red"
					on:click={clearQueue}
					disabled={queue.length === 0 || !announcementAudio.paused}
					outline
				>
					<div class="text-[20px]"><IoIosClose /></div>
					Clear Queue
				</Button>
				<Button color="purple" on:click={concatenateAudio} disabled={queue.length === 0}>
					<div class="text-[20px]"><IoMdDownload /></div>
					Merge & Save
				</Button>

				{#if $programmesQuery.isSuccess}
					<Programmes
						playProgrammeQueue={(programmeStations) => playProgrammeQueueHandler(programmeStations)}
						programmesQueryData={$programmesQuery.data}
						bind:programmeQueue
					/>
				{/if}
			</div>
			<div>
				<h4 class="text-center">
					The MTA announcements are from <a
						href="https://www.youtube.com/@MrRailfan"
						target="_blank"
					>
						MrRailfan
					</a>
					's videos. The Northern Line extension and Southeastern announcements were released under the
					Freedom of Information Act and are for personal use only.
				</h4>
			</div>
		</div>
	</div>
</div>
