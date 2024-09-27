<script lang="ts">
	import Crunker from 'crunker';

	// UI COMPONENTS
	import { Button, Range } from 'flowbite-svelte';

	// ICONS REFERENCE: https://icones.js.org/collection/ion
	import IoIosClose from '~icons/ion/ios-close';
	import IoIosPlay from '~icons/ion/ios-play';
	import MdSubdirectoryArrowLeft from '~icons/ion/ios-return-left';
	import IoMdDownload from '~icons/ion/md-download';
	import IoMdSquare from '~icons/ion/md-square';

	type Props = {
		volume: number;
		isAnnouncementAudioPlaying: boolean;
		queue: string[];
		selectedPhraseIndex: number | undefined;
		selectedInsertIndex: number | undefined;
		currentlyPlayingFile: string;
		onQueueChange: (queue: string[]) => void;
		onStartPlayback: () => void;
		onStopPlayback: () => void;
	};

	let {
		volume = $bindable(),
		isAnnouncementAudioPlaying = $bindable(),
		queue = $bindable(),
		selectedPhraseIndex = $bindable(),
		selectedInsertIndex = $bindable(),
		currentlyPlayingFile = $bindable(),
		onStartPlayback,
		onStopPlayback
	}: Props = $props();

	let phrases: string[] = $derived(
		queue
			.map((file) => file.split('/').pop()?.replace('.wav', ''))
			.filter((phrase) => phrase !== undefined)
	);

	const concatenateAudio = () => {
		let crunker = new Crunker();

		crunker
			.fetchAudio(...queue)
			.then((buffers) => crunker.concatAudio(buffers))
			.then((concatenated) => crunker.export(concatenated, 'audio/wav'))
			.then((output) => crunker.download(output.blob, phrases.join(' - ')))
			.catch((err) => {
				throw new Error(err);
			});
	};

	const clearQueue = () => {
		queue = [];
		selectedPhraseIndex = undefined;
		selectedInsertIndex = undefined;
	};

	const selectPhrase = (phraseIndex: number) => {
		if (currentlyPlayingFile) return;

		selectedPhraseIndex = phraseIndex;
	};

	const removeSelection = () => {
		selectedPhraseIndex = undefined;
		selectedInsertIndex = undefined;
	};

	const deleteSelectedPhrase = () => {
		queue = queue.toSpliced(selectedPhraseIndex as number, 1);
		selectedPhraseIndex = undefined;
	};

	const onStartPlaybackHandler = () => {
		onStartPlayback();
	};

	const onStopPlaybackHandler = () => {
		onStopPlayback();
	};
</script>

<div>
	<h4 class="font-bold">Message</h4>
	<div class="my-2 flex h-[100px] flex-wrap rounded-lg bg-white p-3 text-black">
		{#if phrases.length > 0}
			{#each phrases as phrase, index}
				{#if phrase.length > 0 && isAnnouncementAudioPlaying && index !== selectedInsertIndex && selectedPhraseIndex === undefined && !currentlyPlayingFile}
					<div
						class="h-[25px] w-[10px] cursor-pointer hover:bg-gray-400"
						onclick={() => (selectedInsertIndex = index)}
					></div>
				{:else if index === selectedInsertIndex}
					<div class="flex h-[25px] w-[10px] cursor-pointer flex-col justify-center bg-amber-400">
						<div class="text-[10px]">
							<MdSubdirectoryArrowLeft />
						</div>
					</div>
				{/if}
				{#if selectedInsertIndex === undefined}
					<span onclick={() => selectPhrase(index)} class="mx-1 cursor-pointer">
						{#if currentlyPlayingFile === queue[index]}
							<b class="bg-sky-300">{phrase}</b>
						{:else if selectedPhraseIndex === index}
							<b class="bg-orange-300">{phrase}</b>
						{:else}
							{phrase}
						{/if}
					</span>
				{:else}
					<span class="mx-1">{phrase}</span>
				{/if}
			{/each}
		{:else}
			<i>The queue is empty.</i>
		{/if}
	</div>
	{#if selectedPhraseIndex !== undefined || selectedInsertIndex !== undefined}
		<Button color="red" onclick={removeSelection} outline>Deselect</Button>
		{#if selectedPhraseIndex !== undefined}
			<Button color="red" onclick={deleteSelectedPhrase}>Remove Selected Phrase</Button>
		{/if}
	{:else}
		<i>Click on a phrase to replace it.</i>
	{/if}
	<div class="my-4 flex flex-col">
		<h4 class="my-2 font-bold">Playback volume: {(volume * 100).toFixed(0)}%</h4>
		<Range min="0" max="1" step="0.01" bind:value={volume} />
	</div>
	{#if !currentlyPlayingFile || !isAnnouncementAudioPlaying}
		<Button onclick={onStartPlaybackHandler} disabled={queue.length === 0}>
			<div class="text-[20px]"><IoIosPlay /></div>
			Play Announcement
		</Button>
	{:else}
		<Button onclick={onStopPlaybackHandler}>
			<div class="text-[20px]"><IoMdSquare /></div>
			Stop Playback
		</Button>
	{/if}
	<Button
		color="red"
		onclick={clearQueue}
		disabled={queue.length === 0 || !isAnnouncementAudioPlaying}
		outline
	>
		<div class="text-[20px]"><IoIosClose /></div>
		Clear Queue
	</Button>
	<Button color="purple" onclick={concatenateAudio} disabled={queue.length === 0}>
		<div class="text-[20px]"><IoMdDownload /></div>
		Merge & Save
	</Button>
</div>
