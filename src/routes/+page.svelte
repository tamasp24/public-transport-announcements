<script lang="ts">
	//@ts-nocheck
	import axios from 'axios';
	import { createQuery } from '@tanstack/svelte-query';
	import Crunker from 'crunker';
	import Papa from 'papaparse';

	// UI COMPONENTS
	import { Button, Input, Range, Select, Checkbox } from 'flowbite-svelte';

	// ICONS REFERENCE:
	import IoIosPlay from 'svelte-icons/io/IoIosPlay.svelte';
	import IoMdSquare from 'svelte-icons/io/IoMdSquare.svelte';
	import IoIosAdd from 'svelte-icons/io/IoIosAdd.svelte';
	import IoIosClose from 'svelte-icons/io/IoIosClose.svelte';
	import IoMdDownload from 'svelte-icons/io/IoMdDownload.svelte';
	import IoIosRepeat from 'svelte-icons/io/IoIosRepeat.svelte';
	import IoIosArrowForward from 'svelte-icons/io/IoIosArrowForward.svelte';
	import IoIosArrowBack from 'svelte-icons/io/IoIosArrowBack.svelte';
	import MdSubdirectoryArrowLeft from 'svelte-icons/md/MdSubdirectoryArrowLeft.svelte';

	type Pack = {
		name: string;
		files: string[];
	};

	type Programme = {
		Route: string;
		Station: string;
		'On Approach': string;
		'At Station': string;
		Terminating: string;
		'Transfer 1': string;
		'Transfer 2': string;
		'Transfer 3': string;
		Root: string;
	};

	const filePathRoot: string = '/audios/';
	const filesQuery = createQuery<string>({
		queryKey: ['audio-files'],
		queryFn: async () => await axios.get(`${filePathRoot}/files.txt`).then((r) => r.data)
	});
	const programmesQuery = createQuery<string>({
		queryKey: ['programmes'],
		queryFn: async () => await axios.get(`${filePathRoot}/Programmes.csv`).then((r) => r.data)
	});

	let announcementPacks = $derived.by(() => {
		if ($filesQuery.isSuccess) return processFileList($filesQuery.data);
		else return [];
	});
	let programmes: Programme[] = $derived.by(() => {
		if ($programmesQuery.isSuccess)
			return Papa.parse($programmesQuery.data, { header: true, skipEmptyLines: true }).data;
		else return [];
	});
	let selectedProgramme: string = $state('');
	let queue: string[] = $state([]);
	let programmeRouteList: string[] = $derived([...new Set(programmes.map((p) => p.Route))]);
	let programmeQueue: string[] = $state([]);
	let programmeStations: Programme[] = $derived(
		programmes.filter((p) => p.Route === selectedProgramme)
	);
	let programmeCurrentStation: Programme | null = $state(null);
	let playAnnouncementOnProgrammeStationChange: boolean = $state(false);
	let playbackType: 'normal' | 'programme' = $state('normal');
	let announcementAudio = new Audio();
	let previewAudio = new Audio();
	let playbackVolume: number = $state(0.3);
	let search: string = $state('');
	let fileList: string[] = $derived.by(() => {
		if (announcementPacks.length > 0)
			return announcementPacks.filter((p) => p.name === selectedPack)[0].files;
		else return [];
	});
	const fileListFilteredBySearchField = $derived(
		fileList.filter((f) => f.toLowerCase().includes(search.toLowerCase())).sort()
	);
	let currentlyPlayingFile: string = $state('');
	let selectedPack: string = $state('MTA');
	let selectedPhrase: string = $state('');
	let selectedInsertIndex: number | undefined = $state(undefined);

	$effect(() => {
		/* ANNOUNCEMENT AND PREVIEW AUDIO VARS ARE THE SAME BUT ARE KEPT SEPARATE
		FOR EASIER FUTURE MANAGEMENT */
		announcementAudio.volume = previewAudio.volume = playbackVolume;

		/* AUTO-SELECT FIRST STATION ON ROUTE SELECTION */
		if (selectedProgramme) {
			programmeCurrentStation = programmeStations[0];
		}
	});

	const playAudio = (filePath: string) => {
		announcementAudio.src = `${filePath}`;
		announcementAudio.play();
		currentlyPlayingFile = filePath;
	};

	const playPreview = (filePath: string) => {
		previewAudio.src = filePath;
		previewAudio.play();
	};

	/* INSERT PHRASE AT SELECTED INDEX IF A PHRASE HAS BEEN CLICKED ON,
	OTHERWISE APPEND IT TO THE END */
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

	const playProgrammeQueue = () => {
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

	const programmeOnApproach = () => {
		programmeQueue = programmes
			.filter(
				(p) =>
					p.Route === programmeCurrentStation?.Route &&
					p.Station === programmeCurrentStation.Station
			)[0]
			['On Approach'].split(';');

		playProgrammeQueue();
	};

	const programmeAtStation = () => {
		programmeQueue = programmes
			.filter(
				(p) =>
					p.Route === programmeCurrentStation?.Route &&
					p.Station === programmeCurrentStation.Station
			)[0]
			['At Station'].split(';');

		playProgrammeQueue();
	};

	const programmeTerminating = () => {
		programmeQueue = programmes
			.filter(
				(p) =>
					p.Route === programmeCurrentStation?.Route &&
					p.Station === programmeCurrentStation.Station
			)[0]
			['Terminating'].split(';');

		playProgrammeQueue();
	};

	// AUTO-SELECT THE PREVIOUS STATION (RELATIVE TO THE CURRENT STATION)
	const programmeGoToPreviousStation = () => {
		// FIND INDEX OF CURRENT STATION BY NAME, THEN SUBTRACT 1 FROM THE RETURNED VALUE
		let indexOfPreviousStation = programmeStationIndex(programmeCurrentStation?.Station) - 1;

		if (isCurrentProgrammeStationIndexWithinBounds(indexOfPreviousStation)) {
			programmeCurrentStation = programmeStations[indexOfPreviousStation];
		}

		if (
			playAnnouncementOnProgrammeStationChange === true &&
			programmeCurrentStation?.['On Approach']
		) {
			programmeOnApproach();
		}
	};

	// AUTO-SELECT THE NEXT STATION (RELATIVE TO THE CURRENT STATION)
	const programmeGoToNextStation = () => {
		// FIND INDEX OF CURRENT STATION BY NAME, THEN ADD 1 TO THE RETURNED VALUE
		let indexOfNextStation = programmeStationIndex(programmeCurrentStation?.Station) + 1;

		if (isCurrentProgrammeStationIndexWithinBounds(indexOfNextStation)) {
			programmeCurrentStation = programmeStations[indexOfNextStation];
		}

		if (
			playAnnouncementOnProgrammeStationChange === true &&
			programmeCurrentStation?.['On Approach']
		) {
			programmeOnApproach();
		}
	};

	/* GET INDEX OF STATION BY NAME */
	const programmeStationIndex = (stationName: string): number => {
		return programmeStations.map((s) => s.Station).indexOf(stationName);
	};

	const isCurrentProgrammeStationIndexWithinBounds = (currentStationIndex: number): boolean => {
		if (currentStationIndex >= 0 && currentStationIndex < programmeStations.length) return true;
		else return false;
	};
</script>

<div class="h-full p-5">
	<div class="flex h-full gap-16">
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
				{:else if fileList.length > 0}
					{#each fileListFilteredBySearchField as file}
						{@const fileName = file.split('/').pop().replace('.wav', '')}
						{@const directParentDir = file.split('/').slice(-2)[0]}
						<div class="flex items-center justify-between gap-2 rounded-lg bg-gray-700 p-1">
							<Button class="h-full" size="xs" on:click={() => playPreview(`${file}`)}
								><div class="size-[20px]"><IoIosPlay /></div></Button
							>
							<div class="flex flex-col align-middle">
								<span class="text-center">{fileName}</span>
								<small>{directParentDir}</small>
							</div>
							{#if !selectedPhrase}
								<Button class="h-full" color="green" size="xs" on:click={() => addToQueue(file)}
									><div class="size-[20px]"><IoIosAdd /></div></Button
								>
							{:else}
								<Button
									class="h-full"
									color="green"
									size="xs"
									on:click={replaceSelectedPhrase(file)}
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
							{@const fileName = file.split('/').pop().replace('.wav', '')}
							{#if queue.length > 0 && announcementAudio.paused && index !== selectedInsertIndex}
								<div
									class="h-[25px] w-[10px] cursor-pointer hover:bg-gray-400"
									onclick={() => (selectedInsertIndex = index)}
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
				{#if selectedPhrase || selectedInsertIndex}
					<Button color="red" on:click={removeSelection} outline>Deselect</Button>
					<Button color="red" on:click={deleteSelectedPhrase} disabled={!selectedPhrase}
						>Remove Selected Phrase</Button
					>
				{:else}
					<i>Click on a phrase to replace it.</i>
				{/if}
				<div class="my-4 flex flex-col">
					<h4 class="my-2 font-bold">Playback volume: {(playbackVolume * 100).toFixed(0)}%</h4>
					<Range min="0" max="1" step="0.01" bind:value={playbackVolume} />
				</div>
				{#if !currentlyPlayingFile || announcementAudio.paused}
					<Button on:click={playQueue} disabled={queue.length === 0}
						><div class="size-[20px]"><IoIosPlay /></div>
						Play Announcement</Button
					>
				{:else}
					<Button on:click={stopPlayback}
						><div class="size-[20px]"><IoMdSquare /></div>
						Stop Playback</Button
					>
				{/if}
				<Button
					color="red"
					on:click={clearQueue}
					disabled={queue.length === 0 || !announcementAudio.paused}
					outline
					><div class="size-[20px]"><IoIosClose /></div>
					Clear Queue</Button
				>
				<Button color="purple" on:click={concatenateAudio} disabled={queue.length === 0}
					><div class="size-[20px]"><IoMdDownload /></div>
					Merge & Save</Button
				>

				<div class="mt-20">
					<div class="flex gap-4">
						<div class="flex flex-col">
							<label>
								<span>
									<b>Route</b>
								</span>
								<Select
									items={programmeRouteList.sort().map((p) => ({
										name: `${p}`,
										value: p
									}))}
									bind:value={selectedProgramme}
								/>
							</label>
						</div>
						{#if programmeStations.length > 0}
							<div class="flex flex-col">
								<label>
									<span>
										<b>Station</b>
									</span>
									<Select
										items={programmeStations.map((s) => ({
											name: `${s.Station}`,
											value: s
										}))}
										bind:value={programmeCurrentStation}
									/>
								</label>
							</div>
						{/if}
					</div>
					<div class="my-2 flex flex-wrap gap-4">
						<Button
							on:click={programmeGoToPreviousStation}
							disabled={!programmeCurrentStation ||
								!isCurrentProgrammeStationIndexWithinBounds(
									programmeStationIndex(programmeCurrentStation?.Station) - 1
								)}
							><div class="size-[20px]"><IoIosArrowBack /></div>
							Go to Previous Station</Button
						>
						<Button
							on:click={programmeOnApproach}
							disabled={!programmeCurrentStation || !programmeCurrentStation['On Approach']}
							>On Approach</Button
						>
						<Button
							on:click={programmeAtStation}
							disabled={!programmeCurrentStation || !programmeCurrentStation['At Station']}
							>At Station</Button
						>
						<Button
							on:click={programmeTerminating}
							disabled={!programmeCurrentStation || !programmeCurrentStation.Terminating}
							>Terminating</Button
						>
						<Button
							on:click={programmeGoToNextStation}
							disabled={!programmeCurrentStation ||
								!isCurrentProgrammeStationIndexWithinBounds(
									programmeStationIndex(programmeCurrentStation?.Station) + 1
								)}
							>Go to Next Station
							<div class="size-[20px]"><IoIosArrowForward /></div></Button
						>
					</div>
					<div class="flex-column my-2 flex">
						<Checkbox bind:checked={playAnnouncementOnProgrammeStationChange}
							>Play announcement when skipping to station</Checkbox
						>
					</div>
					<div class="flex h-[100px] flex-wrap rounded-lg bg-white p-3 text-black"></div>
				</div>
			</div>
			<div>
				<h4 class="text-center">
					The MTA announcements are from <a
						href="https://www.youtube.com/@MrRailfan"
						target="_blank">MrRailfan</a
					>'s videos. The Northern Line extension and Southeastern announcements were released under
					the Freedom of Information Act and are for personal use only.
				</h4>
			</div>
		</div>
	</div>
</div>
