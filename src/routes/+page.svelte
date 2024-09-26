<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import axios from 'axios';

	import type { Programme } from '$lib/types';
	// SECTIONS
	import FileList from '$lib/Sections/FileList.svelte';
	import Programmes from '$lib/Sections/Programmes.svelte';
	import CustomAnnouncementBuilder from '$lib/Sections/CustomAnnouncementBuilder.svelte';

	const filePathRoot: string = '/audios/';
	const programmesQuery = createQuery<string>({
		queryKey: ['programmes'],
		queryFn: async () => await axios.get(`${filePathRoot}/Programmes.csv`).then((r) => r.data)
	});
	let queue: string[] = $state([]);
	let programmeQueue: string[] = $state([]);
	let playbackType: 'normal' | 'programme' = $state('normal');
	let announcementAudio = new Audio();
	let isAnnouncementAudioPlaying: boolean = $state(false);
	let playbackVolume: number = $state(0.3);
	let currentlyPlayingFile: string = $state('');
	let selectedPhraseIndex: number | undefined = $state(undefined);
	let selectedInsertIndex: number | undefined = $state(undefined);

	$effect(() => {
		/* ANNOUNCEMENT AND PREVIEW AUDIO VARS ARE THE SAME BUT ARE KEPT SEPARATE
		FOR EASIER FUTURE MANAGEMENT */
		announcementAudio.volume = playbackVolume;
		isAnnouncementAudioPlaying = announcementAudio.paused;
	});

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

	const playAudio = (filePath: string) => {
		announcementAudio.src = `${filePath}`;
		announcementAudio.play();
		currentlyPlayingFile = filePath;
	};

	const stopPlayback = () => {
		announcementAudio.pause();
		announcementAudio.currentTime = 0;
		currentlyPlayingFile = '';
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
			bind:queue
			bind:selectedPhraseIndex
			bind:selectedInsertIndex
			volume={playbackVolume}
			{filePathRoot}
		/>
		<div
			class="flex h-full w-full flex-col justify-between overflow-y-auto overflow-x-hidden pl-1 pr-7"
		>
			<CustomAnnouncementBuilder
				bind:volume={playbackVolume}
				bind:queue
				bind:selectedPhraseIndex
				bind:selectedInsertIndex
				bind:currentlyPlayingFile
				bind:isAnnouncementAudioPlaying
				onStartPlayback={playQueue}
				onStopPlayback={stopPlayback}
				onQueueChange={(queue) => (queue = queue)}
			/>
			{#if $programmesQuery.isSuccess}
				<Programmes
					playProgrammeQueue={(programmeStations) => playProgrammeQueueHandler(programmeStations)}
					programmesQueryData={$programmesQuery.data}
					bind:programmeQueue
				/>
			{/if}
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
