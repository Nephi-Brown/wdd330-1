const eventList = document.getElementById("event");
const getButton = document.querySelector("button");

async function fetchAndDisplayEvent() {
	try {
		const apiUrl = "https://www.eventbriteapi.com/v3/users/me/?token=3JHCKH7IX3J5SBA63XCU";
		const response = await fetch(apiUrl);

		// Handle HTTP errors (e.g., 404 Not Found, 500 Server Error)
		if (!response.ok) {
			throw new Error(`Network response was not ok. Status: ${response.status}`);
		}

		const event = await response.json(); // await promised response

		event.forEach((event) => {
			// build figure content
			const li = document.createElement("li");
			li.innerHTML = `<strong>${event.name}</strong> | ${event.email}`;
			userList.appendChild(li);
		});
	} catch (error) {
		eventList.innerHTML = `Could not load events: Error: ${error.message}`;
	}
}

getButton.addEventListener("click", fetchAndDisplayEvent);