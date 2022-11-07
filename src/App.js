import React, { useState, useRef } from 'react'
import './App.css'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
// import CustomModal from './components/CustomModal'
// import DateRangePicker from 'react-bootstrap-daterangepicker'
// import { DatePicker, Form, Modal, Space } from 'antd'
// import { FormGroup, Label, Input } from 'reactstrap'
import { gapi } from 'gapi-script'

// const apiKEY = 'AIzaSyA0SwXJDL2P09zUazraFeq0Rk1W3r_pvf4'
const clientId = '843203138930-kor2v2jk15o9sqt76qmagckdr7slkqsq.apps.googleusercontent.com'
// const access_token = 'ya29.a0Aa4xrXOFsKdO5vWQgmcIpSJSroU3cuQ8DIGsqRXchUcxf5dl3K9blDgPrmdGZ9rU9EcbLxQY9LAp9i5ZzSlefAnktucVkGX405ofLUh9tVl5GqF80RkaTGFqLNZr6LLCQrksv5Ne9D-TIAD_2Ycn5POtL0V-aCgYKATASARESFQEjDvL9uM3YTbkj0-T5WvLVX0TvBw0163'

gapi.load('client:auth2', async () => {
	await gapi.auth2.init({
		clientId: clientId,
		plugin_name: 'calender',
	})
	console.log('first loaded')
})

function App() {
	const [title, setTitle] = useState('')
	const [start, setStart] = useState(new Date())
	const [end, setEnd] = useState(new Date())
	const [events, setEvents] = useState([])
	const [modal, setModal] = useState(false)
	const [state, setState] = useState({})
	const [confirmModal, setConfirmModal] = useState(false)

	const calendarRef = useRef(null)

	const addEvent = (event) => {
		// function initiate() {
		// 	var request = gapi.client.calendar.events.insert({
		// 		calendarId: calendarID,
		// 		resource: event,
		// 	})
		// 	request.execute((e) => {
		// 		window.open(e.htmlLink)
		// 	})
		// }
		// gapi.load('client', initiate)
		return gapi.client.calendar.events.insert({
			calendarId: 'primary',
			resource: event,
		})
	}

	async function handleSubmit() {
		try {
			const newEvent = {
				summary: title,
				start: { dateTime: state.selectInfo?.startStr || start.toISOString() },
				end: { dateTime: state.selectInfo?.endStr || end.toISOString() },
			}
			//returns the created event in google calendar
			const res = await addEvent(newEvent)
			console.log(res)
			logEvents()
			handleClose()
			// console.log(state, 'state')
			// console.log(newEvent, 'event')
			// let calendarApi = calendarRef.current.getApi()
			// calendarApi.addEvent(newEvent)
		} catch (error) {
			console.log(error)
			handleClose()
		}
	}

	const updateEvent = (event) => {
		return gapi.client.calendar.events.insert({
			calendarId: 'primary',
			resource: event,
		})
	}

	function handleEdit() {
		// console.log(start, end);
		// state.clickInfo.event.setAllDay(true);

		state.clickInfo.event.setStart(start)
		state.clickInfo.event.setEnd(end)
		state.clickInfo.event.mutate({
			standardProps: { title },
		})
		handleClose()
	}

	function handleDelete() {
		// console.log(JSON.stringify(state.clickInfo.event));
		// console.log(state.clickInfo.event.id);
		state.clickInfo.event.remove()
		handleClose()
	}

	function handleClose() {
		setTitle('')
		setStart(new Date())
		setEnd(new Date())
		setState({})
		setModal(false)
	}

	const handleCloseModal = () => {
		handleClose()
		setModal(false)
	}

	const handleEventClick = (clickInfo) => {
		setState({ clickInfo, state: 'update' })
		// set detail
		setTitle(clickInfo.event.title)
		setStart(clickInfo.event.start)
		setEnd(clickInfo.event.end)

		setModal(true)
	}

	const handleDateSelect = (selectInfo) => {
		console.log(selectInfo)
		// console.log(moment(selectInfo.startStr).format('YYYY-MM-DD hh:mm:ss a'))
		selectInfo.view.calendar.unselect()
		setState({ selectInfo, state: 'create' })
		setStart(selectInfo.start)
		setEnd(selectInfo.end)
		setModal(true)
	}

	const renderEventContent = (eventInfo) => {
		return (
			<div>
				<i
					style={{
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{eventInfo.event.title}
				</i>
			</div>
		)
	}

	function handleEventDrop(checkInfo) {
		setState({ checkInfo, state: 'drop' })
		setConfirmModal(true)
	}

	function handleEventResize(checkInfo) {
		setState({ checkInfo, state: 'resize' })
		setConfirmModal(true)
	}

	// function handleEvents(events) {
	// console.log(events)
	// }

	const authenticate = async () => {
		await gapi.auth2
			.getAuthInstance()
			.signIn({ scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events' })
		await gapi.client.load('https://content.googleapis.com/discovery/v1/apis/calendar/v3/rest')
		console.log('signed in and client loaded')
		logEvents()
	}

	// const handleClientLoad = () => {
	// 	gapi.load('client:auth2', async () => {
	// 		await gapi.client.init({
	// 			apiKey: apiKEY,
	// 			clientId: clientId,
	// 			scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
	// 			plugin_name: 'calender',
	// 		})
	// 		await gapi.auth2.getAuthInstance().signIn()
	// 		// console.log(user, 'user')
	// 		await gapi.client.load('https://content.googleapis.com/discovery/v1/apis/calendar/v3/rest')
	// 	})
	// }
	// handleClientLoad()

	const logEvents = async () => {
		try {
			const response = await gapi.client.calendar.events.list({ calendarId: 'primary', maxAttendees: 1 })
			const gCalEvents = response.result.items
			let newEventsArr = []
			gCalEvents.forEach((item) => {
				let event = {
					id: item.id,
					title: item.summary,
					start: item.start.dateTime,
					end: item.end.dateTime,
				}
				newEventsArr.push(event)
			})
			// setEvents((prevArr) => [...prevArr, ...newEventsArr])
			setEvents(newEventsArr)
		} catch (err) {
			console.log(err)
		}
	}

	// useEffect(() => {
	// try {
	// 	// const user = gapi.auth2.getAuthInstance().signIn()
	// 	// gapi.client.load('https://content.googleapis.com/discovery/v1/apis/calendar/v3/rest')
	// 	// const calendarResponse = gapi.client.calendar.events.list({ calendarId: 'primary', maxAttendees: 1 })
	// 	// console.log(calendarResponse)
	// 	gapi.load('client:auth2', () => {
	// 		gapi.client
	// 			.init({
	// 				apiKey: apiKEY,
	// 				clientId: clientId,
	// 				scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
	// 				plugin_name: 'calender',
	// 			})
	// 			.then(async () => {
	// 				gapi.auth2
	// 					.getAuthInstance()
	// 					.signIn()
	// 					.then(async (res) => {
	// 						console.log(res)
	// 						await gapi.client.load('https://content.googleapis.com/discovery/v1/apis/calendar/v3/rest')
	// 						await gapi.client.calendar.events.list({ calendarId: 'primary', maxAttendees: 1 }).then(
	// 							function (response) {
	// 								// Handle the results here (response.result has the parsed body).
	// 								console.log('Response', response)
	// 							},
	// 							function (err) {
	// 								console.error('Execute error', err)
	// 							},
	// 						)
	// 					})
	// 			})
	// 	})
	// } catch (err) {
	// 	console.log(err)
	// }
	// }, [])

	// // Make sure the client is loaded and sign-in is complete before calling this method.
	// const execute = async () => {
	// 	var event = {
	// 		summary: 'Google I/O 2015',
	// 		location: '800 Howard St., San Francisco, CA 94103',
	// 		description: "A chance to hear more about Google's developer products.",
	// 		start: {
	// 			dateTime: '2022-10-28T09:00:00-07:00',
	// 			timeZone: 'America/Los_Angeles',
	// 		},
	// 		end: {
	// 			dateTime: '2022-10-28T17:00:00-07:00',
	// 			timeZone: 'America/Los_Angeles',
	// 		},
	// 		recurrence: ['RRULE:FREQ=DAILY;COUNT=2'],
	// 		attendees: [{ email: 'lpage@example.com' }, { email: 'sbrin@example.com' }],
	// 		reminders: {
	// 			useDefault: false,
	// 			overrides: [
	// 				{ method: 'email', minutes: 24 * 60 },
	// 				{ method: 'popup', minutes: 10 },
	// 			],
	// 		},
	// 	}

	// 	addEvent('primary', event)
	// }

	return (
		<div className="App">
			<button onClick={() => authenticate()}>authenticate</button>
			{/* <button onClick={() => logEvents()}>log events</button> */}
			{/* <button onClick={() => execute()}>execute</button> */}
			<FullCalendar
				ref={calendarRef}
				plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
				headerToolbar={{
					left: 'prev,today,next',
					center: 'title',
					right: 'dayGridMonth,timeGridWeek,timeGridDay',
					// right: '',
				}}
				buttonText={{
					today: 'current',
					month: 'month',
					week: 'week',
					day: 'day',
					list: 'list',
				}}
				initialView="timeGridWeek"
				editable={true}
				selectable={true}
				selectMirror={true}
				dayMaxEvents={true}
				weekends={true}
				select={handleDateSelect}
				eventContent={renderEventContent} // custom render function
				eventClick={handleEventClick}
				// eventsSet={() => handleEvents(events)}
				// initialEvents={[{ title: 'nwe', id: '123', start: '2022-11-05' }]}
				events={events}
				eventDrop={handleEventDrop}
				eventResize={handleEventResize}
				//
				// dateClick={handleDateClick}
				eventAdd={(e) => {
					console.log('eventAdd', e)
				}}
				eventChange={(e) => {
					console.log('eventChange', e)
				}}
				eventRemove={(e) => {
					console.log('eventRemove', e)
				}}
			/>

			{/* <CustomModal
				title={state.state === 'update' ? 'Update Event' : 'Add Event'}
				isOpen={modal}
				toggle={handleCloseModal}
				onCancel={handleCloseModal}
				onSubmit={state.clickInfo ? handleEdit : handleSubmit}
				submitText={state.clickInfo ? 'Update' : 'Save'}
				onDelete={state.clickInfo && handleDelete}
				deleteText="Delete"
			>
				<FormGroup>
					<Label for="exampleEmail">Title</Label>
					<Input
						type="text"
						name="title"
						placeholder="with a placeholder"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
				</FormGroup>
				<FormGroup>
					<Label for="exampleEmail">From - End</Label>
					<Space>
						<DatePicker.RangePicker showTime={{ format: 'HH:mm' }} />
					</Space>
					<DateRangePicker
						initialSettings={{
							locale: {
								format: 'M/DD hh:mm A',
							},
							startDate: start,
							endDate: end,
							timePicker: true,
						}}
						onApply={(event, picker) => {
							// console.log(
							//   "picker",
							//   picker.startDate.toISOString(),
							//   picker.endDate.toISOString()
							// );
							setStart(new Date(picker.startDate))
							setEnd(new Date(picker.endDate))
						}}
					>
						<input className="form-control" type="text" />
					</DateRangePicker>
				</FormGroup>
			</CustomModal> */}

			{/* <CustomModal
				title={state.state === 'resize' ? 'Resize Event' : 'Drop Event'}
				isOpen={confirmModal}
				toggle={() => {
					state.checkInfo.revert()
					setConfirmModal(false)
				}}
				onCancel={() => {
					state.checkInfo.revert()
					setConfirmModal(false)
				}}
				cancelText="Cancel"
				onSubmit={() => setConfirmModal(false)}
				submitText={'OK'}
			>
				Do you want to {state.state} this event?
			</CustomModal> */}
		</div>
	)
}

export default App
