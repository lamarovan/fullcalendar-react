import React, { useState, useRef } from 'react'
import './App.css'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { gapi } from 'gapi-script'
import { Form, Modal, Input, DatePicker } from 'antd'
import moment from 'moment'

const clientId = process.env.CLIENT_ID

gapi.load('client:auth2', async () => {
	await gapi.auth2.init({
		clientId: clientId,
		plugin_name: 'calender',
	})
	console.log('first loaded')
})

function App() {
	const [events, setEvents] = useState([])
	const [modal, setModal] = useState(false)
	const [state, setState] = useState({})
	const [confirmModal, setConfirmModal] = useState(false)
	const [form] = Form.useForm()

	const calendarRef = useRef(null)

	const addEvent = (event) => {
		return gapi.client.calendar.events.insert({
			calendarId: 'primary',
			resource: event,
		})
	}

	async function handleSubmit() {
		console.log('submit')
		try {
			const newEvent = {
				summary: form.getFieldValue('title'),
				start: { dateTime: state.selectInfo?.startStr },
				end: { dateTime: state.selectInfo?.endStr },
			}
			const res = await addEvent(newEvent)
			console.log(res)
			logEvents()
		} catch (error) {
			console.log(error)
		} finally {
			handleClose()
		}
	}

	async function handleEdit() {
		try {
			const res = await gapi.client.calendar.events.update({
				calendarId: 'primary',
				eventId: state.clickInfo.event.id,
				resource: {
					summary: form.getFieldValue('title'),
					start: {
						dateTime: form.getFieldValue('start').format(),
					},
					end: {
						dateTime: form.getFieldValue('end').format(),
					},
				},
			})
			console.log(res, 'update response')
			logEvents()
		} catch (error) {
			console.log(error)
		} finally {
			handleClose()
		}
	}

	function handleDelete() {
		// console.log(JSON.stringify(state.clickInfo.event));
		// console.log(state.clickInfo.event.id);
		state.clickInfo.event.remove()
		handleClose()
	}

	function handleClose() {
		form.resetFields()
		setState({})
		setModal(false)
	}

	const handleCloseModal = () => {
		handleClose()
		setModal(false)
	}

	const handleEventClick = (clickInfo) => {
		form.setFieldsValue({
			title: clickInfo.event.title,
			start: moment(clickInfo.event.startStr),
			end: moment(clickInfo.event.endStr),
		})
		setState({ clickInfo, state: 'update' })

		setModal(true)
	}

	const handleDateSelect = (selectInfo) => {
		selectInfo.view.calendar.unselect()
		setState({ selectInfo, state: 'create' })
		form.setFieldsValue({
			start: moment(selectInfo.startStr),
			end: moment(selectInfo.endStr),
		})
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

	const authenticate = async () => {
		await gapi.auth2
			.getAuthInstance()
			.signIn({ scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events' })
		await gapi.client.load('https://content.googleapis.com/discovery/v1/apis/calendar/v3/rest')
		console.log('signed in and client loaded')
		logEvents()
	}

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

	const handleChange = (newDate, dateString, field) => {
		form.setFieldValue(field, newDate)
		// debugger
	}

	return (
		<div className="App">
			<button onClick={() => authenticate()}>authenticate</button>
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

			<Modal
				title={state.state === 'update' ? 'Update Event' : 'Add Event'}
				open={modal}
				onOk={state?.clickInfo ? handleEdit : handleSubmit}
				onCancel={handleCloseModal}
			>
				<Form form={form} autoComplete="off">
					<Form.Item label="Title" name="title">
						<Input />
					</Form.Item>
					<Form.Item label="Start date/time" name="start">
						<DatePicker
							showTime={{ format: 'HH:mm' }}
							onChange={(newDate, dateString) => handleChange(newDate, dateString, 'start')}
						/>
					</Form.Item>
					<Form.Item label="End date/time" name="end">
						<DatePicker
							showTime={{ format: 'HH:mm' }}
							onChange={(newDate, dateString) => handleChange(newDate, dateString, 'end')}
						/>
					</Form.Item>
				</Form>
			</Modal>
		</div>
	)
}

export default App
