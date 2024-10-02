	// The store will hold all information needed globally
	let store = {
		track_id: undefined,
		track_name: undefined,
		player_id: undefined,
		player_name: undefined,
		race_id: undefined,
	}

	document.addEventListener("DOMContentLoaded", function() {
		onPageLoad()
		setupClickHandlers()
	})

	async function onPageLoad() {
		try {
			getTracks()
				.then(tracks => {
					const html = renderTrackCards(tracks)
					renderAt('#tracks', html)
				})

			getRacers()
				.then((racers) => {
					const html = renderRacerCars(racers)
					renderAt('#racers', html)
				})
		} catch(error) {
			console.log("Problem getting tracks and racers ::", error.message)
			console.error(error)
		}
	}

	function setupClickHandlers() {
		document.addEventListener('click', function(event) {
			const { target } = event

			// Race track form field
			if (target.matches('.card.track')) {
				handleSelectTrack(target)
				store.track_id = target.id
				store.track_name = target.innerHTML
			}

			// Racer form field
			if (target.matches('.card.racer')) {
				handleSelectRacer(target)
				store.player_id = target.id
				store.player_name = target.innerHTML
			}

			// Submit create race form
			if (target.matches('#submit-create-race')) {
				event.preventDefault()
		
				// start race
				handleCreateRace();
			}

			// Handle acceleration click
			if (target.matches('#gas-peddle')) {
				handleAccelerate()
			}

			console.log("Store updated :: ", store)
		}, false)
	}

	async function delay(ms) {
		try {
			return await new Promise(resolve => setTimeout(resolve, ms));
		} catch(error) {
			console.log("an error shouldn't be possible here")
			console.log(error)
		}
	}

	// This async function controls the flow of the race, add the logic and error handling
	async function handleCreateRace() {
		
		// render starting UI
		renderAt('#race', renderRaceStartView(store.track_name))
		
		try {
			const race = await createRace(store.player_id, store.track_id);
			store.race_id = race.ID;
			
			await runCountdown();

			if(typeof store.race_id !== 'undefined') {
				await startRace(store.race_id);
			
				await runRace(store.race_id);
			}	
		} catch(error) {
			console.log("Problem handleCreateRace ::", error.message)
		}
	}

	function runRace(raceID) {
		
		return new Promise(resolve => {
				
			let raceInterval = setInterval(async () => {
				let race = await getRace(raceID);
					switch(race.status) {
						case "in-progress":
							renderAt('#leaderBoard', raceProgress(race.positions));
						break;
						case "finished":
							clearInterval(raceInterval);
							renderAt('#race', resultsView(race.positions)); // to render the results view
							resolve(race);
							break;
					}
  			
			}, 500);
		
		}).catch(err => console.log("Problem runRace ::", err.message));
	}

	async function runCountdown() {
		try {
			// wait for the DOM to load
			await delay(1000);
			let timer = 3;
			let countDownInterval;

			return new Promise(resolve => {
				countDownInterval = setInterval(() => {
					// run this DOM manipulation inside the set interval to decrement the countdown for the user
					if(document.getElementById('big-numbers') !== null &&  document.getElementById('big-numbers') !== undefined) {
						document.getElementById('big-numbers').innerHTML = --timer;
						if(timer === 0) {
							clearInterval(countDownInterval);
							resolve(timer);
						}
					}

				}, 1000 );
			})
		} catch(error) {
			console.log(error);
		}
	}

	function handleSelectRacer(target) {
		// remove class selected from all racer options
		const selected = document.querySelector('#racers .selected');
		if(selected) {
			selected.classList.remove('selected');
		}

		// add class selected to current target
		target.classList.add('selected');
	}

	function handleSelectTrack(target) {
		// remove class selected from all track options
		const selected = document.querySelector('#tracks .selected');
		if (selected) {
			selected.classList.remove('selected');
		}

		// add class selected to current target
		target.classList.add('selected');	
	}

	function handleAccelerate() {
		try {
			accelerate(store.race_id);			
		} catch(error) {
			console.log("Problem getting accelerate ::", error.message)
		}
	}

	// HTML VIEWS ------------------------------------------------

	function renderRacerCars(racers) {
		if (!racers.length) {
			return `
				<h4>Loading Racers...</4>
			`
		}

		const results = racers.map(renderRacerCard).join('')

		return `
			<ul id="racers">
				${results}
			</ul>
		`
	}

	function renderRacerCard(racer) {
		const { id, driver_name, top_speed, acceleration, handling } = racer
		return `<h4 class="card racer" id="${id}">${driver_name}</h4>
				<p>Top speed: ${top_speed}</p>
				<p>Acceleration: ${acceleration}</p>
				<p>Handling: ${handling}</p>`;
	}

	function renderTrackCards(tracks) {
		if (!tracks.length) {
			return `
				<h4>Loading Tracks...</4>
			`;
		}

		const results = tracks.map(renderTrackCard).join('')

		return `
			<ul id="tracks">
				${results}
			</ul>
		`;
	}

	function renderTrackCard(track) {
		const { id, name } = track;

		return `<h4 id="${id}" class="card track">${name}</h4>`;
	}

	function renderCountdown(count) {
		return `
			<h2>Race Starts In...</h2>
			<p id="big-numbers">${count}</p>
		`;
	}

	function renderRaceStartView(track) {
		return `
			<header>
				<h1>Race: ${track}</h1>
			</header>
			<main id="two-columns">
				<section id="leaderBoard">
					${renderCountdown(3)}
				</section>

				<section id="accelerate">
					<h2>Directions</h2>
					<p>Click the button as fast as you can to make your racer go faster!</p>
					<button id="gas-peddle">Click Me To Win!</button>
				</section>
			</main>
			<footer></footer>
		`;
	}

	function resultsView(positions) {
		userPlayer.driver_name += " (you)"
		let count = 1
	
		const results = positions.map(p => {
			return `
				<tr>
					<td>
						<h3>${count++} - ${p.driver_name}</h3>
					</td>
				</tr>
			`;
		})

		return `
			<header>
				<h1>Race Results</h1>
			</header>
			<main>
				<h3>Race Results</h3>
				<p>The race is done! Here are the final results:</p>
				${results.join('')}
				<a href="/race">Start a new race</a>
			</main>
		`;
	}

	function raceProgress(positions) {
		let userPlayer = positions.find(e => e.id === parseInt(store.player_id));
		userPlayer.driver_name += " (you)";

		positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1);
		let count = 1;

		const results = positions.map(p => {
			return `
				<tr>
					<td>
						<h3>${count++} - ${p.driver_name}</h3>
					</td>
				</tr>
			`;
		});

		return `
			<table>
				${results.join('')}
			</table>
		`;
	}

	function renderAt(element, html) {
		const node = document.querySelector(element);

		node.innerHTML = html;
	}

	
	// API CALLS ------------------------------------------------

	const SERVER = 'http://localhost:3001';
	const API = 'api';
	const TRACKS = 'tracks';
	const CARS = 'cars';
	const RACES = 'races';
	const ACCELERATE = 'accelerate';

	function defaultFetchOpts() {
		return {
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin' : SERVER,
			},
		};
	}

	// TODO - Make a fetch call (with error handling!) to each of the following API endpoints 

	function getTracks() {
		return fetch(`${SERVER}/${API}/${TRACKS}`)
				.then(res => res.json())
				.catch(err => console.log(err));
	}

	function getRacers() {
		return fetch(`${SERVER}/${API}/${CARS}`)
				.then(res => res.json())
				.catch(err => console.log("Problem with createRace request::", err));
	}

	function createRace(player_id, track_id) {
		player_id = parseInt(player_id)
		track_id = parseInt(track_id)
		const body = { player_id, track_id }
		
		return fetch(`${SERVER}/${API}/${RACES}`, {
			method: 'POST',
			...defaultFetchOpts(),
			dataType: 'jsonp',
			body: JSON.stringify(body)
		})
		.then(res => res.json())
		.catch(err => console.log("Problem with createRace request::", err));
	}

	function getRace(id) {
		// GET request to `${SERVER}/api/races/${id}`
		return fetch(`${SERVER}/${API}/${RACES}/${id}`)
				.then(res => res.json())
				.catch(err => console.log("Problem with getRace request::", err));
	}

	function startRace(id) {
		return fetch(`${SERVER}/${API}/${RACES}/${id}/start`, {
			method: 'POST',
			...defaultFetchOpts(),
		})
		.catch(err => console.log("Problem with startRace request::", err))
	}

	function accelerate(id) {
		return fetch(`${SERVER}/${API}/${RACES}/${id}/${ACCELERATE}`, {
			method: 'POST',
			...defaultFetchOpts()
		})
		.catch(err => console.log("Problem with accelerate request::", err));
	}
