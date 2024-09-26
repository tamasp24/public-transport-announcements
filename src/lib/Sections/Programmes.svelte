<script lang="ts">
	// UTILITY
	import Papa from 'papaparse';

	// UI
	import { Button, Select, Checkbox } from 'flowbite-svelte';

	// ICONS REFERENCE: https://icones.js.org/collection/ion
	import IoIosArrowForward from '~icons/ion/ios-arrow-forward';
	import IoIosArrowBack from '~icons/ion/ios-arrow-back';

	import type { Programme } from '$lib/types';

	type Props = {
		playProgrammeQueue: (programmeStations: Programme[]) => void;
		programmesQueryData: string;
		programmeQueue: string[];
	};

	let { programmesQueryData, playProgrammeQueue, programmeQueue = $bindable([]) }: Props = $props();

	let programmes: Programme[] = $derived.by(() => {
		let pp = Papa.parse(programmesQueryData, { header: true, skipEmptyLines: true });

		if (pp.errors.length > 0) {
			return [];
		}

		return pp.data as Programme[];
	});
	let programmeRouteList: string[] = $derived([...new Set(programmes.map((p) => p.Route))]);
	let programmeStations: Programme[] = $derived(
		programmes.filter((p) => p.Route === selectedProgramme)
	);
	let programmeCurrentStation: Programme | null = $state(null);
	let playAnnouncementOnProgrammeStationChange: boolean = $state(false);
	let selectedProgramme: string = $state('');

	$effect(() => {
		if (selectedProgramme) {
			programmeCurrentStation = programmeStations[0];
		}
	});

	const programmeOnApproach = () => {
		programmeQueue = programmes
			.filter(
				(p) =>
					p.Route === programmeCurrentStation?.Route &&
					p.Station === programmeCurrentStation.Station
			)[0]
			['On Approach'].split(';');

		playProgrammeQueue(programmeStations);
	};

	const programmeAtStation = () => {
		programmeQueue = programmes
			.filter(
				(p) =>
					p.Route === programmeCurrentStation?.Route &&
					p.Station === programmeCurrentStation.Station
			)[0]
			['At Station'].split(';');

		playProgrammeQueue(programmeStations);
	};

	const programmeTerminating = () => {
		programmeQueue = programmes
			.filter(
				(p) =>
					p.Route === programmeCurrentStation?.Route &&
					p.Station === programmeCurrentStation.Station
			)[0]
			['Terminating'].split(';');

		playProgrammeQueue(programmeStations);
	};

	// AUTO-SELECT THE PREVIOUS STATION (RELATIVE TO THE CURRENT STATION)
	const programmeGoToPreviousStation = () => {
		// FIND INDEX OF CURRENT STATION BY NAME, THEN SUBTRACT 1 FROM THE RETURNED VALUE
		let indexOfPreviousStation = programmeStationIndex(programmeCurrentStation!.Station) - 1;

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
		let indexOfNextStation = programmeStationIndex(programmeCurrentStation!.Station) + 1;

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
			onclick={programmeGoToPreviousStation}
			disabled={!programmeCurrentStation ||
				!isCurrentProgrammeStationIndexWithinBounds(
					programmeStationIndex(programmeCurrentStation?.Station) - 1
				)}
		>
			<div class="text-[20px]"><IoIosArrowBack /></div>
			Go to Previous Station
		</Button>
		<Button
			onclick={programmeOnApproach}
			disabled={!programmeCurrentStation || !programmeCurrentStation['On Approach']}
		>
			On Approach
		</Button>
		<Button
			onclick={programmeAtStation}
			disabled={!programmeCurrentStation || !programmeCurrentStation['At Station']}
		>
			At Station
		</Button>
		<Button
			onclick={programmeTerminating}
			disabled={!programmeCurrentStation || !programmeCurrentStation.Terminating}
		>
			Terminating
		</Button>
		<Button
			onclick={programmeGoToNextStation}
			disabled={!programmeCurrentStation ||
				!isCurrentProgrammeStationIndexWithinBounds(
					programmeStationIndex(programmeCurrentStation?.Station) + 1
				)}
		>
			Go to Next Station
			<div class="text-[20px]"><IoIosArrowForward /></div>
		</Button>
	</div>
	<div class="flex-column my-2 flex">
		<Checkbox bind:checked={playAnnouncementOnProgrammeStationChange}>
			Play 'On Approach' announcement on 'Go to' button press
		</Checkbox>
	</div>
	<div class="flex h-[100px] flex-wrap rounded-lg bg-white p-3 text-black"></div>
</div>
