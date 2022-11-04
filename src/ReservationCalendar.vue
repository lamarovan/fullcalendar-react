<template>
  <div class="calendar-content-wrapper">
    <div
      :class="{
        'calendar-container': true,
        'show-more-rows': showMore,
      }"
    >
      <div id="calendar">
        <FullCalendar ref="fullCalendar" :options="calendarOptions" />
      </div>
      <button class="btn show-more" @click="showMoreToggle">
        <img
          :class="{
            'arrow-down': true,
            up: showMore,
          }"
          alt=""
          src="@/assets/icons/arrow_icon.svg"
        />
      </button>
    </div>

    <!-- modal section start -->
    <CalendarModal
      id="calendarModal"
      ref="calendarModal"
      @selectedDate="handleSelectedDate"
    />

    <Modal id="eventDropModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <button
            class="btn-close"
            data-bs-dismiss="modal"
            type="button"
            @click="cancelDropEvent"
          ></button>
          <div class="modal-header">
            <h4>予約を更新しますか？</h4>
          </div>

          <div class="modal-footer justify-content-center">
            <button
              class="btn btn-primary"
              type="button"
              @click="acceptDropEvent"
            >
              はい
            </button>
            <button
              class="btn btn-secondary"
              type="button"
              @click="cancelDropEvent"
            >
              いいえ
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- modal section end -->

    <Modal id="storeMemoModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <button
            class="btn-close"
            data-bs-dismiss="modal"
            type="button"
            @click="cancelStoreMemoModal"
          ></button>
          <div class="modal-header">
            <h4 class="mb-2">日別店舗メモ</h4>
          </div>

          <div class="modal-content border-0">
            <div class="d-flex justify-content-center">
              <input
                v-model="contents"
                class="form-control"
                name="storeMemo"
                type="text"
              />
            </div>
            <div
              v-if="this.storeMemoErrors.length > 0"
              class="error-box"
              role="alert"
            >
              {{ this.storeMemoErrors }}
            </div>
          </div>

          <div class="modal-footer justify-content-center pt-3 pb-0">
            <button
              class="btn btn-secondary"
              data-bs-dismiss="modal"
              type="button"
              @click="cancelStoreMemoModal"
            >
              戻る
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click="acceptStoreMemoModal"
            >
              登録修正
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Details section -->
    <CalendarDetail
      v-if="reservationDetail"
      :reservation="reservationDetail"
      @setCustomerData="nextTimeClick($event)"
      @setReservationId="selectPreviousReservation($event)"
      @startLoading="startLoading"
      @updateEvents="getReservations"
      @goToNextDay="nextDay"
    />
    <!-- </div> -->
    <loading
      v-model:active="isCalendarLoading"
      :can-cancel="false"
      :is-full-page="true"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import "@fullcalendar/core/vdom";
import FullCalendar, { DateSelectArg } from "@fullcalendar/vue3";
import interactionPlugin from "@fullcalendar/interaction";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";

import CalendarDetail from "../../components/CalendarDetail.vue";
import CalendarModal from "../../components/modals/CalendarModal.vue";
import * as bootstrap from "bootstrap";
import { fetch, store as post } from "@/core/api/api-service";
import {
  CONSULTATION_CLASSIFICATION,
  RESERVATION_ROUTE,
  RESERVATION_STATUS,
  RESERVATION_TYPE,
  SYMPTOMS,
  TIME_FRAME,
} from "@/core/store/enums";
import { reservationTypes, symptoms, timeFrame } from "@/core/store/constants";
import moment from "moment";
import Modal from "@/components/modals/Modal.vue";
import { Modal as BootstrapModal } from "bootstrap";
import { Employee, User } from "@/core/interface";
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/vue-loading.css";
import i18n from "@/i18n";
import { useToast, POSITION } from 'vue-toastification';

export default defineComponent({
  name: "ReservationCalendar",
  components: {
    Modal,
    CalendarModal,
    FullCalendar,
    CalendarDetail,
    Loading,
  },
  data() {
    return {
      storeMemoText: "",
      storeMemoErrors: "",
      StoreUpdateId: "",
      StoreUpdateMemo: false,
      isCalendarisCalendarLoading: true,
      user: null as User | null,
      datesFormat: false,
      storeStartTime: "",
      isCalendarLoading: false,
      storeLoaded: false,
      employeeLoaded: false,
      dropEventData: null,
      eventStop: null,
      TIME_FRAME: TIME_FRAME,
      timeFrame: timeFrame,
      symptoms: symptoms,
      reservationTypes: reservationTypes,
      selectedReservationId: null as any,
      storeId: "",
      contents: "",
      reservationPerson: this.$route.params.reservationPerson || "",
      phone: this.$route.params.phone || "",
      customer: {
        customerNumber: this.$route.params.customerNumber || null,
        name: this.$route.params.name || "",
        surname: this.$route.params.surname || "",
        telephoneNumber: this.$route.params.telephoneNumber || "",
        cellphoneNumber: this.$route.params.cellphoneNumber || "",
        previousPractitionerId: this.$route.params.practitionerId || "",
      },
      selectElLoaded: false,
      practitionerOptions: [],
      reservationDetail: null,
      showMore: false,
      storeOptions: [],
      pratitionerEvents: [],
      taskEvents: [],
      holidayEvents: [],
      regularHolidayEvents: [] as any,
      calendarOptions: {
        loading: this.calendarLoadingHandler,
        selectable: true,
        titleFormat: {
          month: "long",
          year: "numeric",
          day: "numeric",
          weekday: "short",
        },
        longPressDelay: 100,
        customButtons: {
          prev: {
            click: (event: any) => {
              if (event) {
                let calendarApi = (this.$refs.fullCalendar as any)?.getApi();
                // calendarApi.prev();

                const initial: string =
                  this.$store.getters.reservationCalendarStoreDate !==
                  "undefined"
                    ? moment(this.$store.getters.reservationCalendarStoreDate)
                        .subtract(1, "days")
                        .format("YYYY-MM-DD")
                    : moment(moment()).subtract(1, "days").format("YYYY-MM-DD");
                this.getCalendarApi()?.gotoDate(initial);

                this.$store.dispatch(
                  "setReservationCalendarStoreDate",
                  initial
                );
                this.getEmployee();
                this.getStoreMemo();
                this.calendarToggleButton();
              }
            },
          },
          next: {
            click: (event: any) => {
              if (event) {
                let calendarApi = (this.$refs.fullCalendar as any)?.getApi();
                // calendarApi.next();
                const initial: string =
                  this.$store.getters.reservationCalendarStoreDate !==
                  "undefined"
                    ? moment(this.$store.getters.reservationCalendarStoreDate)
                        .add(1, "days")
                        .format("YYYY-MM-DD")
                    : moment(moment()).add(1, "days").format("YYYY-MM-DD");
                this.getCalendarApi()?.gotoDate(initial);
                this.$store.dispatch(
                  "setReservationCalendarStoreDate",
                  initial
                );
                this.getEmployee();
                this.getStoreMemo();
                this.calendarToggleButton();
              }
            },
          },
          // registrationButton: {
          //   text: "予約メモ",
          //   click: this.goToReservationMemoRegistration,
          // },
          storeMemo: {
            text: "店舗メモ",
            click: (event: any) => {
              this.onStoreMemoClick();
            },
          },
          receptionAssistance: {
            text: "",
            // click: this.receptionBtnClick,
          },
          assistanceInput: {},
          nameHolder: {},
          customerDesc: {},
          customerName: {},
          nameSuffix: {},
          deselectButton: {
            text: "選択解除",
            click: this.deSelectCalendarDetail,
          },
        },
        timeZone: "UTC",
        locale: "ja",
        plugins: [resourceTimelinePlugin, interactionPlugin],
        initialView: "resourceTimelineDay",
        aspectRatio: 1.5,
        headerToolbar: {
          // left: "prev title next receptionAssistance assistanceInput storeMemo",
          left: "prev title next receptionAssistance storeMemo ",
          // center: "",
          right:
            "nameHolder customerDesc customerName nameSuffix deselectButton registrationButton",
          // right: "registrationButton",
        },
        lazyFetching: false,
        editable: true,
        resourceAreaHeaderClassNames: ["select-new"],
        resourceAreaHeaderContent: this.resourceAreaHeaderContent,
        resourceAreaWidth: "11%",
        slotDuration: "00:15",
        slotMinTime: "09:00:00",
        slotMaxTime: "21:00:00",
        slotMinWidth: 18,
        eventMinWidth: 15,
        // slotLabelFormat: {
        //   hour: "numeric",
        //   hour12: false,
        //   meridiem: false,
        //   omitZeroMinute: true,
        // },
        slotLabelFormat: this.formatDate,
        // scrollTime: "09:00:00",
        eventDisplay: "auto",
        eventBorderColor: "#fff",
        resourceGroupField: "",
        resources: [],
        resourceOrder: "sortOrder",
        eventContent: this.eventContent,
        dateClick: this.goToReservationRegistration,
        select: this.onCalendarFrameSelect,
        // selectAllow: this.disablePastSelection,
        events: [],
        eventDrop: this.updateReservationEvent,
        eventResize: this.updateReservationEvent,
        eventClick: this.eventClick,
        slotEventOverlap: true,
        eventOverlap: false,
        // eventOverlap: function (stillEvent: EventApi, movingEvent: EventApi) {
        //   if (
        //     movingEvent.extendedProps.type === RESERVATION_TYPE.TASK &&
        //     !movingEvent.extendedProps.block
        //   ) {
        //     return true;
        //   } else if (
        //     stillEvent.extendedProps.type === RESERVATION_TYPE.TASK &&
        //     !stillEvent.extendedProps.block
        //   ) {
        //     return true;
        //   }
        //   return false;
        // },
      },
    };
  },
  methods: {
    calendarLoadingHandler(isLoading: boolean) {
      // this.isCalendarLoading = isLoading;
    },
    startLoading() {
      this.isCalendarLoading = true;
    },
    getMemoResourceIndex(reservationList: any, reservation: any): number {
      const momentReservationStart = moment(
        `${reservation.date}T${reservation.startingTime}+00:00`
      );
      const momentReservationEnd = moment(
        `${reservation.date}T${reservation.endingTime}+00:00`
      );
      const filteredList = reservationList.filter(
        (reserve: any) =>
          reserve.reservationStatus === RESERVATION_STATUS.NOT_CONFIRMED &&
          (moment(reserve.start).isSame(momentReservationStart) ||
            moment(reserve.end).isSame(moment(momentReservationEnd)) ||
            moment(reserve.start).isBetween(
              momentReservationStart,
              momentReservationEnd
            ) ||
            moment(reserve.end).isBetween(
              momentReservationStart,
              momentReservationEnd
            ))
      );

      let latestUpdatedIndex = 0;
      if (filteredList.length > 0) {
        filteredList.forEach((reserveation: any) => {
          const resourceMemoIndex = Number(
            reserveation.resourceId.replace("Reservation Memo ", "")
          );
          if (resourceMemoIndex > latestUpdatedIndex) {
            latestUpdatedIndex = resourceMemoIndex;
          }
        });
        return latestUpdatedIndex + 1;
      } else {
        return latestUpdatedIndex;
      }
    },
    formatDate(data: any) {
      if (this.datesFormat === true) {
        return (
          moment(data.date).format("HH:mm") +
          "-" +
          moment(data.date).add(60, "minutes").format("HH:mm")
        );
      } else {
        const date1 = moment(data.date).format("HH") + "時";
        return date1;
      }
    },
    getCalendarApi() {
      return (this.$refs.fullCalendar as any)?.getApi();
    },
    nextDay() {
      this.getCalendarApi().next();
      this.updateCalendarEventsAndResources();
      this.updateCalendarBusinessHours();
    },
    eventContent(args: any) {
      //Create and append select list
      var div = document.createElement("div");
      div.id = "myEvent";

      if (args.event.extendedProps.treatmentMenu) {
        div.style.backgroundColor = args.event.extendedProps.treatmentMenu
          .backgroundColor
          ? args.event.extendedProps.treatmentMenu.backgroundColor.toLowerCase() +
            "33"
          : "";
      } else {
        div.style.backgroundColor = "#fcfcfc";
      }

      var eventIndicatorHr = document.createElement("hr");
      eventIndicatorHr.classList.add("timeline-bar");
      eventIndicatorHr.style.background = args.event.extendedProps.treatmentMenu
        ?.backgroundColor
        ? args.event.extendedProps.treatmentMenu.backgroundColor.toLowerCase()
        : "#5e5e5e";
      eventIndicatorHr.style.opacity = "1";
      div.appendChild(eventIndicatorHr);

      if (
        args.event.extendedProps?.reservationStatus ===
          RESERVATION_STATUS.RECEPTION ||
        args.event.extendedProps?.reservationStatus ===
          RESERVATION_STATUS.ACCOUNTED ||
        args.event.extendedProps?.reservationStatus === RESERVATION_STATUS.TOTAL
      ) {
        div.style.backgroundColor = "#fcfcfc";
        eventIndicatorHr.style.backgroundColor = "#5e5e5e";
      }

      if (
        !args.event.extendedProps.reservationDate.formattedStartDateTime.isAfter(
          moment()
        )
      ) {
        div.classList.add("passed-event");
      }

      // first line of three line display
      var eventTimeDiv = document.createElement("div");
      eventTimeDiv.id = "myEventTime";
      if (
        args.event.extendedProps.reservationRoute === RESERVATION_ROUTE.LINE
      ) {
        let lSpan = document.createElement("span");
        lSpan.classList.add("l-span");
        lSpan.innerHTML = "L";
        eventTimeDiv.appendChild(lSpan);
      }

      const accountsRecivable = document.createTextNode(
        `${
          Number(args.event.extendedProps.customer?.accountsReceivable) > 0
            ? "売掛"
            : ""
        } ${
          args.event.extendedProps.customer?.memberRemainingCoupon &&
          args.event.extendedProps.customer?.membershipFlag
            ? "会残" + args.event.extendedProps.customer.memberRemainingCoupon
            : ""
        } ${
          !args.event.extendedProps.customer?.membershipFlag &&
          args.event.extendedProps.consultationClassification ===
            CONSULTATION_CLASSIFICATION.CONTINUOUS_TREATMENT
            ? "通" +
              Number(args.event.extendedProps.customer?.noOfHospitalVisits + 1)
            : args.event.extendedProps.reservationType === RESERVATION_TYPE.RESERVE && !args.event.extendedProps.customer?.membershipFlag &&
              args.event.extendedProps.consultationClassification !==
                CONSULTATION_CLASSIFICATION.CONTINUOUS_TREATMENT
            ? "通1"
            : ""
        } ${
          args.event.extendedProps.reservationType === 2 &&
          args.event.extendedProps.status === 2
            ? "完"
            : ""
        } ${args.event.start.getUTCHours()}:${
          args.event.start.getUTCMinutes() === 0
            ? "00"
            : args.event.start.getUTCMinutes()
        }`
      );
      eventTimeDiv.appendChild(accountsRecivable);
      div.appendChild(eventTimeDiv);

      // second line of three line display
      var eventDiv = document.createElement("div");
      eventDiv.id = "myEventTitle";
      if (args.event.extendedProps.reservationType === 1) {
        if (args.event.extendedProps?.customer) {
          if (args.event.extendedProps.customer.membershipFlag) {
            let lSpan = document.createElement("img");
            lSpan.classList.add("l-image-span");
            eventDiv.appendChild(lSpan);
          }
          const eventTitle = document.createTextNode(
            `${
              args.event.extendedProps?.customer?.name &&
              args.event.extendedProps?.customer?.surname
                ? args.event.extendedProps.customer?.surname +
                  " " +
                  args.event.extendedProps.customer?.name +
                  " 様"
                : args.event.extendedProps.customer?.surname 
                ? args.event.extendedProps.customer.surname + " 様"
                : "- 様"
            }`
          );
          eventDiv.appendChild(eventTitle);
        } else {
          const eventTitle = document.createTextNode(
            `${
              args.event.extendedProps?.reservationPerson
                ? args.event.extendedProps?.reservationPerson + " 様"
                : "- 様"
            }`
          );
          eventDiv.appendChild(eventTitle);
        }
      }
      div.appendChild(eventDiv);

      // third line of three line display
      // remarks of reservation via line left
      var eventDescriptionDiv = document.createElement("div");
      eventDescriptionDiv.id = "myEventDescription";

      if (args.event.extendedProps.reservationType === 1) {
        if (args.event.extendedProps.customer) {
          const thirdLine = document.createTextNode(
            `${
              args.event.extendedProps?.managementMemo
                ? args.event.extendedProps?.managementMemo?.substring(0, 5)
                : ""
            }
              ${args.event.extendedProps?.symptom === 1 ? "日常" : "交通"} ${
              args.event.extendedProps?.remarks
                ? args.event.extendedProps?.remarks?.substring(0, 5)
                : ""
            } ${
              Number(args.event.extendedProps.customer?.accountsReceivable) > 0
                ? `${args.event.extendedProps.customer?.accountsReceivable}円`
                : ""
            }
              `
            // } ${reservationTypes[args.event.extendedProps.type]} `
          );
          eventDescriptionDiv.appendChild(thirdLine);
        } else {
          const eventDescription = document.createTextNode(
            `${
              args.event.extendedProps.description
                ? args.event.extendedProps.description?.substring(0, 5)
                : ""
            } ${args.event.extendedProps?.symptom === 1 ? "日常" : "交通"} ${
              args.event.extendedProps?.remarks
                ? args.event.extendedProps?.remarks?.substring(0, 5)
                : ""
            }`
          );
          eventDescriptionDiv.appendChild(eventDescription);
        }
      } else if (args.event.extendedProps.reservationType === 2) {
        const eventDescription = document.createTextNode(
          `${
            args.event.extendedProps?.detail
              ? args.event.extendedProps.detail?.substring(0, 5)
              : ""
          } ${args.event.extendedProps.taskType?.name}`
        );
        eventDescriptionDiv.appendChild(eventDescription);
      } else {
        const eventDescription = document.createTextNode(
          `${
            args.event.extendedProps?.details
              ? args.event.extendedProps.details?.substring(0, 5)
              : ""
          } ${args.event.extendedProps.absenceType?.name}`
        );
        eventDescriptionDiv.appendChild(eventDescription);
      }
      div.appendChild(eventDescriptionDiv);

      if (this.selectedReservationId === args.event.id) {
        this.showCalendarDetail(args);
        this.selectedReservationId = null;
      }

      let arrayOfDomNodes = [div];
      return { domNodes: arrayOfDomNodes };
    },
    resourceAreaHeaderContent() {
      //Create array of options to be added
      let storeArrayEl: any =
        this.storeOptions.length > 0 ? this.storeOptions : [];
      // //Create and append select list
      var selectList = document.createElement("select");
      selectList.id = "store-select";
      if (this.user?.employeeDivsions?.[0]?.isHeadquarter) {
        var optionAll = document.createElement("option");
        optionAll.value = "All";
        optionAll.text = "All";
        selectList.appendChild(optionAll);
      }
      //Create and append the options
      for (var i = 0; i < storeArrayEl.length; i++) {
        var option = document.createElement("option");
        option.value = storeArrayEl[i].value;
        option.text = storeArrayEl[i].name;
        selectList.appendChild(option);
      }
      let storeArrayElOfDomNodes = [selectList];
      selectList.addEventListener("change", (event: any) => {
        this.storeId = event.target.value;
        this.updateCalendarEventsAndResources();
        this.updateCalendarBusinessHours();
        this.$store.dispatch("setReservationCalendarStoreId", this.storeId);
        const storeMemoBtn = document.querySelector(
          ".fc-storeMemo-button"
        ) as HTMLElement;
        if (!this.storeId || this.storeId !== "All") {
          this.getStoreMemo();
          storeMemoBtn.style.display = "block";
        } else {
          const receptionAssBtn = document.querySelector(
            ".fc-receptionAssistance-button"
          ) as HTMLElement;
          receptionAssBtn.style.display = "none";
          storeMemoBtn.style.display = "none";
        }
      });
      if (this.storeId) {
        selectList.value = this.storeId;
        // this.$store.dispatch("setSelectedStoreID", this.storeId);
      }
      return { domNodes: storeArrayElOfDomNodes };
    },
    handleSelectedDate(selectedDate: string) {
      this.$store.dispatch("setReservationCalendarStoreDate", selectedDate);
      this.getCalendarApi()?.gotoDate(selectedDate);
      this.updateCalendarEventsAndResources();
      this.updateCalendarBusinessHours();
      this.closeCalendarModal();
      this.getEmployee();
      const storeMemoBtn = document.querySelector(
        ".fc-storeMemo-button"
      ) as HTMLElement;
      if (!this.storeId || this.storeId !== "All") {
        this.getStoreMemo();
        storeMemoBtn.style.display = "block";
      } else {
        const receptionAssBtn = document.querySelector(
          ".fc-receptionAssistance-button"
        ) as HTMLElement;
        receptionAssBtn.style.display = "none";
        storeMemoBtn.style.display = "none";
      }
    },
    showMoreToggle() {
      this.showMore = !this.showMore;
    },
    cancelDropEvent() {
      (this.eventStop as any)?.revert();
      const element = document.getElementById("eventDropModal") as HTMLElement;
      const myModal = BootstrapModal.getOrCreateInstance(element);
      myModal.hide();
    },
    cancelStoreMemoModal() {
      const element = document.getElementById("storeMemoModal") as HTMLElement;
      const myModal1 = BootstrapModal.getInstance(element);
      myModal1?.hide();
    },
    acceptDropEvent() {
      const data = this.dropEventData;
      this.updateReservations(data);
    },
    acceptStoreMemoModal() {
      this.storeMemoErrors = "";
      // if (!this.contents) {
      //   this.storeMemoErrors = `${i18n.global.t("Errors.E061")}`;
      // }
      if (this.contents && this.contents.length > 20) {
        this.storeMemoErrors = `${i18n.global.t("Errors.E060")}`;
      }

      const data: any = {};
      data.date =
        this.$store.getters.reservationCalendarStoreDate === undefined ||
        this.$store.getters.reservationCalendarStoreDate === "undefined"
          ? moment().format("YYYY-MM-DD")
          : this.$store.getters.reservationCalendarStoreDate;
      data.storeId = this.storeId;
      data.contents = this.contents;
      if (!this.storeMemoErrors) {
        this.updateStoreMemo(data);
      }
    },
    async updateStoreMemo(data: any) {
      const type = this.StoreUpdateMemo;
      const formData = new FormData();
      if (type === true) {
        formData.append("_method", "PUT");
      }
      formData.append("store_id", data?.storeId);
      formData.append("date", data?.date);
      formData.append(
        "contents",
        data?.contents === null ? "" : data?.contents
      );
      if (type !== true) {
        const updateMemoStoreRes = await post(
          `${process.env.VUE_APP_BASE_API_URL}/api/v1/store-memos`,
          formData
        )
          .then((response) => {
            this.storeMemoText = data?.contents !== null ? data?.contents : "";
            this.calendarOptions.customButtons.receptionAssistance.text =
              data?.contents;
            const element = document.getElementById(
              "storeMemoModal"
            ) as HTMLElement;
            const receptionAssistanceBtn = document.getElementsByClassName(
              "fc-receptionAssistance-button"
            );
            const assistanceBtn: HTMLElement =
              receptionAssistanceBtn[0] as HTMLElement;
            if (this.storeMemoText) {
              assistanceBtn.style.display = "block";
            } else {
              assistanceBtn.style.display = "none";
            }
            const myModal1 = BootstrapModal.getInstance(element);
            myModal1?.hide();
          })
          .catch((err) => {
            const element = document.getElementById(
              "storeMemoModal"
            ) as HTMLElement;
            const myModal1 = BootstrapModal.getInstance(element);
            myModal1?.hide();
          });
      } else {
        const id = this.StoreUpdateId;
        const updateMemoStoreRes = await post(
          `${process.env.VUE_APP_BASE_API_URL}/api/v1/store-memos/${id}`,
          formData
        )
          .then((response) => {
            this.storeMemoText = data?.contents !== null ? data?.contents : "";
            this.calendarOptions.customButtons.receptionAssistance.text =
              this.storeMemoText;
            const receptionAssistanceBtn = document.getElementsByClassName(
              "fc-receptionAssistance-button"
            );
            const assistanceBtn: HTMLElement =
              receptionAssistanceBtn[0] as HTMLElement;
            if (this.storeMemoText) {
              assistanceBtn.style.display = "block";
            } else {
              assistanceBtn.style.display = "none";
            }
            const element = document.getElementById(
              "storeMemoModal"
            ) as HTMLElement;
            const myModal1 = BootstrapModal.getInstance(element);
            myModal1?.hide();
          })
          .catch((err) => {
            const element = document.getElementById(
              "storeMemoModal"
            ) as HTMLElement;
            const myModal1 = BootstrapModal.getInstance(element);
            myModal1?.hide();
          });
      }
    },
    showCalendarDetail(eventInfo: any) {
      this.reservationDetail = eventInfo.event;
    },
    updateReservationEvent(eventInfo: any) {
      const blurFocus = eventInfo.el.blur;
      if (blurFocus) {
        this.eventStop = eventInfo;
        const start: any = eventInfo?.event.start;
        const end = eventInfo?.event.end;
        const todays = moment(new Date()).format("YYYY/MM/DD");
        // if (
        //   eventInfo?.event._def?.extendedProps?.type === 2 &&
        //   eventInfo?.event._def?.extendedProps?.status === 2
        // ) {
        //   (this.eventStop as any)?.revert();
        // }
        // else {
        if (start && end) {
          if (!moment(start).isSameOrAfter(todays)) {
            (eventInfo as any)?.revert();
          } else {
            const startHour = `${
              start.getUTCHours() < 10
                ? `0${start.getUTCHours()}`
                : start.getUTCHours()
            }:${
              start.getUTCMinutes() < 10
                ? `${start.getUTCMinutes()}0`
                : start.getUTCMinutes()
            }`;
            const endHour = `${
              end.getUTCHours() < 10
                ? `0${end.getUTCHours()}`
                : end.getUTCHours()
            }:${
              end.getUTCMinutes() < 10
                ? `${end.getUTCMinutes()}0`
                : end.getUTCMinutes()
            }`;
            let data: any = {};
            data.id = eventInfo?.event?.id;

            data.date = eventInfo?.event?.extendedProps.reservationDate.date;
            data.starting_time = startHour;
            data.ending_time = endHour;
            data.store_id = this.storeId;
            data._method = "PUT";
            data.reservation_type =
              eventInfo?.event.extendedProps.reservationType;
            if (
              data.reservation_type === RESERVATION_TYPE.TASK ||
              RESERVATION_TYPE.PUBLIC_HOLIDAY_AND_OTHERS
            ) {
              data.status = String(eventInfo?.event.extendedProps.status || "");
            }

            if (eventInfo?.oldResource?.id) {
              if (eventInfo?.newResource?.id.includes("Reservation Memo")) {
                if (
                  (eventInfo?.event.extendedProps.reservationType ===
                    RESERVATION_TYPE.RESERVE &&
                    eventInfo?.oldEvent?.extendedProps?.reservationStatus ===
                      RESERVATION_STATUS.CONFIRMED) ||
                  eventInfo?.event.extendedProps.reservationType ===
                    RESERVATION_TYPE.TASK ||
                  eventInfo?.event.extendedProps.reservationType ===
                    RESERVATION_TYPE.PUBLIC_HOLIDAY_AND_OTHERS
                ) {
                  (eventInfo as any)?.revert();
                  return;
                } else {
                  data.reservation_status = RESERVATION_STATUS.NOT_CONFIRMED;
                  data.practitioner_id = null;
                }
              } else {
                data.reservation_status = RESERVATION_STATUS.CONFIRMED;
                data.practitioner_id = eventInfo?.newResource?.id;
              }
            } else if (eventInfo?.oldEvent?.id) {
              data.reservation_status =
                eventInfo?.event.extendedProps.reservationStatus;
              data.practitioner_id =
                eventInfo?.event.extendedProps.practitioner?.id || null;
            }
            this.dropEventData = data;
            // eventStop
            const element = document.getElementById(
              "eventDropModal"
            ) as HTMLElement;
            const myModal = new BootstrapModal(element);
            myModal.show();
            const def = () => {
              return element.focus;
            };
            def();
          }
        }
      }

      // }
    },

    async onStoreMemoClick(data: any) {
      this.storeMemoErrors = "";
      this.contents = "";
      const date =
        this.$store.getters.reservationCalendarStoreDate === undefined ||
        this.$store.getters.reservationCalendarStoreDate === "undefined"
          ? moment().format("YYYY-MM-DD")
          : this.$store.getters.reservationCalendarStoreDate;
      const store = this.storeId;
      const updateMemoStoreRes = await fetch(
        `${process.env.VUE_APP_BASE_API_URL}/api/v1/store-memos?date=${date}&storeId=${store}`
      )
        .then((response) => {
          if (response?.data?.data?.id) {
            this.StoreUpdateMemo = true;
            this.StoreUpdateId = response?.data?.data?.id;
            this.contents =
              response?.data?.data?.contents !== null
                ? response?.data?.data?.contents
                : "";
            const receptionAssistanceBtn = document.getElementsByClassName(
              "fc-receptionAssistance-button"
            );
            const assistanceBtn: HTMLElement =
              receptionAssistanceBtn[0] as HTMLElement;
            if (!this.storeMemoText) {
              assistanceBtn.style.display = "none";
            } else {
              assistanceBtn.style.display = "block";
            }
          } else {
            this.StoreUpdateMemo = false;
            this.StoreUpdateId = "";
            this.contents = "";
          }
          const element = document.getElementById(
            "storeMemoModal"
          ) as HTMLElement;
          const myModal = new BootstrapModal(element);
          myModal.show();
        })
        .catch((err) => {
          const element = document.getElementById(
            "storeMemoModal"
          ) as HTMLElement;
          const myModal1 = BootstrapModal.getInstance(element);
          myModal1?.hide();
        });
    },
    async updateReservations(data: any) {
      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("date", data?.date);
      formData.append("starting_time", data?.starting_time);
      formData.append("ending_time", data?.ending_time);
      formData.append("date", data?.date);
      formData.append("id", data?.id);
      formData.append("store_id", data?.store_id);
      if (data?.practitioner_id) {
        formData.append("practitioner_id", data?.practitioner_id);
      }
      if (data?.reservation_status) {
        formData.append("reservation_status", data?.reservation_status);
      }

      if (data.reservation_type === 1) {
        // const updateReservaitonRes = await post(
        post(
          `${process.env.VUE_APP_BASE_API_URL}/api/v1/reservations/${data?.id}`,
          formData
        ).then((res) => {
          if (res.status === 200) {
            const element = document.getElementById(
              "eventDropModal"
            ) as HTMLElement;
            const myModal = BootstrapModal.getOrCreateInstance(element);
            myModal.hide();
            const reservation: any = res.data.data;
            const reserve: any = {
              date: reservation.date,
              start: `${reservation.date}T${reservation.startingTime}+00:00`,
              end: `${reservation.date}T${reservation.endingTime}+00:00`,
              extendedProps: {
                ...reservation,
                type: reservation.reservationType,
                reservationDate: {
                  date: reservation.date,
                  start: reservation.startingTime,
                  end: reservation.endingTime,
                  formattedStartDateTime: moment(
                    `${reservation.date} ${reservation.startingTime}`,
                    "YYYY-MM-DD HH:mm:ss"
                  ),
                  formattedEndDateTime: moment(
                    `${reservation.date} ${reservation.endingTime}`,
                    "YYYY-MM-DD HH:mm:ss"
                  ),
                },
              },
            };
            this.getReservations();
            this.reservationDetail = reserve;
            // this.showCalendarDetail(reserve);
          }
        }).catch(err => {
          const toast = useToast();
          toast.error(`${err.response.data?.errors?.[0]?.title}`, {
              timeout: 2000,
              position: POSITION.BOTTOM_RIGHT,
            });
          const element = document.getElementById(
              "eventDropModal"
            ) as HTMLElement;
          const myModal = BootstrapModal.getOrCreateInstance(element);
          myModal.hide();
          this.getReservations();
        })
      } else if (data.reservation_type === 2) {
        formData.append("status", data?.status);
        await post(
          `${process.env.VUE_APP_BASE_API_URL}/api/v1/tasks/${data?.id}`,
          formData
        ).then((res) => {
          const element = document.getElementById(
            "eventDropModal"
          ) as HTMLElement;
          const myModal = BootstrapModal.getOrCreateInstance(element);
          myModal.hide();
          const reservation: any = res.data.data;
          const reserve: any = {
            date: reservation.date,
            start: `${reservation.date}T${reservation.startingTime}+00:00`,
            end: `${reservation.date}T${reservation.endingTime}+00:00`,
            extendedProps: {
              ...reservation,
              type: data.reservation_type,
              reservationDate: {
                date: reservation.date,
                start: reservation.startingTime,
                end: reservation.endingTime,
                formattedStartDateTime: moment(
                  `${reservation.date} ${reservation.startingTime}`,
                  "YYYY-MM-DD HH:mm:ss"
                ),
                formattedEndDateTime: moment(
                  `${reservation.date} ${reservation.endingTime}`,
                  "YYYY-MM-DD HH:mm:ss"
                ),
              },
            },
          };
          this.getReservations();
          this.reservationDetail = reserve;
          // this.showCalendarDetail(reserve);
        });
      } else if (data.reservation_type === 3) {
        formData.append("status", data?.status === "true" ? "1" : "0");
        await post(
          `${process.env.VUE_APP_BASE_API_URL}/api/v1/public-holidays/${data?.id}`,
          formData
        ).then((res) => {
          const element = document.getElementById(
            "eventDropModal"
          ) as HTMLElement;
          const myModal = BootstrapModal.getOrCreateInstance(element);
          myModal.hide();
          const reservation: any = res.data.data;
          const reserve: any = {
            date: reservation.date,
            start: `${reservation.date}T${reservation.startingTime}+00:00`,
            end: `${reservation.date}T${reservation.endingTime}+00:00`,
            extendedProps: {
              ...reservation,
              type: data.reservation_type,
              reservationDate: {
                date: reservation.date,
                start: reservation.startingTime,
                end: reservation.endingTime,
                formattedStartDateTime: moment(
                  `${reservation.date} ${reservation.startingTime}`,
                  "YYYY-MM-DD HH:mm:ss"
                ),
                formattedEndDateTime: moment(
                  `${reservation.date} ${reservation.endingTime}`,
                  "YYYY-MM-DD HH:mm:ss"
                ),
              },
            },
          };
          this.getReservations();
          this.reservationDetail = reserve;
        });
      }
      // this.getReservations();
      // this.showCalendarDetail(this.reservationDetail);
    },
    // async disablePastSelection(selectInfo: any) {
    //   const start = moment(selectInfo.startStr.replace("Z", ""));
    //   if (start.isBefore(moment())) {
    //     let calendarApi = await (this.$refs.fullCalendar as any)?.getApi();
    //     calendarApi?.unselect();
    //     return false;
    //   }
    // },
    async onCalendarFrameSelect(info: DateSelectArg) {
      const start = moment(info.startStr.replace("Z", ""));
      let calendarApi = this.getCalendarApi();
      const eventStartTime = moment(start).format("HH:mm");
      const storeStartingTime = moment(this.storeStartTime, "HH:mm:ss").format(
        "HH:mm"
      );

      if (
        moment(eventStartTime, "HH:mm").isSameOrAfter(
          moment(storeStartingTime, "HH:mm")
        )
      ) {
        if (start.isSameOrAfter(moment(), "day")) {
          this.goToReservationRegistration(info);
          return true;
        } else {
          calendarApi?.unselect();
          return false;
        }
      } else {
        calendarApi?.unselect();
        return false;
      }
    },
    goToReservationMemoRegistration() {
      this.$router.push({
        name: "ReservationRegistration",
        query: { type: "reservation-memo" },
      });
    },
    deSelectCalendarDetail() {
      this.reservationDetail = null;
      this.customer = {
        customerNumber: null,
        name: "",
        surname: "",
        telephoneNumber: "",
        cellphoneNumber: "",
        previousPractitionerId: ""
      };
      this.reservationPerson = "";
      this.phone = "";
      document.querySelector<HTMLElement>(
        ".fc-deselectButton-button"
      )!.style.display = "none";
      document.getElementsByClassName("fc-nameHolder-button")[0].innerHTML = "";
      document.getElementsByClassName("fc-customerDesc-button")[0].innerHTML =
        "";
      document.getElementsByClassName("fc-customerName-button")[0].innerHTML =
        "";
      document.getElementsByClassName("fc-nameSuffix-button")[0].innerHTML = "";
    },
    eventClick(info: any) {
      this.showCalendarDetail(info);
    },
    // customer name and deselect button
    nextTimeClick($event: any) {
      this.customer = $event.customer;
      this.customer.previousPractitionerId = $event?.practitioner?.id;
      this.reservationPerson = $event.reservationPerson;
      this.phone = $event.phone;
      this.setUpDeselectBtn();
    },
    setUpDeselectBtn() {
      document.querySelector<HTMLElement>(
        ".fc-deselectButton-button"
      )!.style.display = "block";
      document.querySelector<HTMLElement>(".fc-nameHolder-button")!.innerHTML =
        "顧客名";

      if (this.customer?.customerNumber) {
        document.querySelector<HTMLElement>(
          ".fc-customerDesc-button"
        )!.style.display = "block";
        document.querySelector<HTMLElement>(
          ".fc-customerDesc-button"
        )!.innerHTML = this.customer.customerNumber.toString();
      } else {
        document.querySelector<HTMLElement>(
          ".fc-customerDesc-button"
        )!.style.display = "none";
      }

      let name: string;
      this.customer?.name && this.customer?.surname
        ? (name = this.customer.surname + " " + this.customer.name)
        : (name = String(this.reservationPerson));

      document.querySelector<HTMLElement>(
        ".fc-customerName-button"
      )!.innerHTML = name;

      document.getElementsByClassName("fc-nameSuffix-button")[0].innerHTML =
        "様";
    },
    goToReservationRegistration(info: any) {
      const { start, end, resource } = info;
      if (start && end) {
        this.$router.push({
          name: "ReservationRegistration",
          params: {
            startHour: moment.utc(start).format("HH:mm"),
            endHour: `${
              end.getUTCHours() < 10
                ? `0${end.getUTCHours()}`
                : end.getUTCHours()
            }:${
              end.getUTCMinutes() < 10
                ? `${end.getUTCMinutes()}0`
                : end.getUTCMinutes()
            }`,
            date: moment
              .utc(
                resource.title === "reservation-memo" ? new Date() : info.start
              )
              .format("YYYY-MM-DD"),
            practitioner: resource.id,
            store: this.storeId,
            customerNumber: this.customer?.customerNumber,
            reservation_person:
              this.customer?.name && this.customer?.surname
                ? this.customer?.surname + " " + this.customer?.name
                : this?.reservationPerson
                ? this.reservationPerson
                : "",
            phone:
              this.customer?.cellphoneNumber ||
              this.customer?.telephoneNumber ||
              this.phone,
            next_time: this.customer?.customerNumber ? "1" : "0",
            prevPractitionerID: this.customer?.previousPractitionerId,
          },
          query: {
            type: resource.id.includes("Reservation Memo")
              ? "reservation-memo"
              : "reserve",
          },
        });
      }
    },
    toggleMonthCalendars() {
      const fcToolbarTitle =
        document.querySelector<HTMLElement>(".fc-toolbar-title");
      if (fcToolbarTitle) {
        fcToolbarTitle.addEventListener("click", () => {
          const calendarModalElement = document.getElementById(
            "calendarModal"
          ) as HTMLElement;
          let calendarModal = bootstrap.Modal.getInstance(calendarModalElement);
          if (!calendarModal) {
            calendarModal = new bootstrap.Modal(calendarModalElement);
          }
          calendarModal.toggle();
        });
      }
    },
    // receptionToggle() {
    //   const input = document.createElement("input");
    //   input.type = "text";
    //   input.classList.add("form-control", "header-input");
    //   input.addEventListener("dblclick", this.receptionToggle);

    //   const button = document.createElement("button");
    //   button.innerHTML = "受付アシ午前休み";
    //   button.classList.add(
    //     "fc-button-primary",
    //     "fc-receptionAssistance-button"
    //   );
    //   button.addEventListener("click", this.receptionToggle);

    //   let div = document.querySelector(".fc-toolbar-chunk");
    //   if (div?.lastElementChild?.tagName === "BUTTON") {
    //     div?.lastElementChild?.replaceWith(input);
    //   } else {
    //     div?.lastElementChild?.replaceWith(button);
    //   }
    // },
    receptionBtnClick() {
      let input = document.querySelector<HTMLElement>(
        ".fc-receptionAssistance-button"
      );
      input!.style.opacity = "1";
      input!.style.zIndex = "2";
      input?.addEventListener("dblclick", this.assistanceInputClick);
    },
    placeAssistanceInput() {
      let input = document.createElement("input");
      input.type = "text";
      input.classList.add("form-control", "header-input");

      let element = document.querySelector(".fc-assistanceInput-button");
      element?.replaceWith(input);
    },
    assistanceInputClick() {
      let input = document.querySelector<HTMLElement>("input.header-input");
      input!.style.opacity = "0";
      input!.style.zIndex = "0";
    },
    closeCalendarModal() {
      let calendarModal: any = document.getElementById("calendarModal");
      if (calendarModal) {
        calendarModal = bootstrap.Modal.getInstance(calendarModal);
        calendarModal.toggle();
      }
    },
    getEmployee() {
      const calendarDate: string =
        this.$store.getters.reservationCalendarStoreDate === undefined ||
        this.$store.getters.reservationCalendarStoreDate === "undefined"
          ? moment().format("YYYY-MM-DD")
          : this.$store.getters.reservationCalendarStoreDate;
      let reservationUrl = `?date=${calendarDate}`;
      fetch(`/api/v1/storeEmployee${reservationUrl}`)
        // fetch(`/api/v1/storeEmployee`)
        .then((res) => {
          const practionerRes = res.data.data;
          this.practitionerOptions = practionerRes;
          return practionerRes;
        })

        .then((practionerRes: any) => {
          this.updateCalendarEventsAndResources(practionerRes);
          setTimeout(() => {
            this.isCalendarLoading = false;
          }, 2000);
        });
    },
    async setInitialDate() {
      let calendarApi = await (this.$refs.fullCalendar as any)?.getApi();
      const initial: string =
        this.$store.getters.reservationCalendarStoreDate !== "undefined"
          ? this.$store.getters.reservationCalendarStoreDate
          : moment(moment()).format("YYYY-MM-DD");
      if (initial) {
        (this.$refs.fullCalendar as any)?.getApi()?.gotoDate(initial);
        //   this.$store.dispatch("resetRegistrationSteps", {});
      }
    },
    getStores() {
      this.isCalendarLoading = true;
      fetch(`/api/v1/getStores`)
        .then((res) => {
          const storeRes = res.data.data;
          // const filteredStoreIdByPublicFlag: any = storeRes.filter(
          //   (fltStr: any) => fltStr.publicFlg == true
          // );
          // if (filteredStoreIdByPublicFlag.length > 0) {
          //   this.storeOptions = filteredStoreIdByPublicFlag
          if (storeRes.length > 0) {
            this.storeOptions = storeRes
              .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
              .map((store: any) => {
                return {
                  value: store.id,
                  name: store.storeName,
                  icon: require("@/assets/icons/check-solid.svg"),
                  ...store,
                };
              });
            // this.isCalendarLoading = false;
            return this.storeOptions;
          } else {
            // this.isCalendarLoading = false;
            this.storeOptions = [];
          }
        })
        .then((storeOptions: any) => {
          if (storeOptions.length > 0) {
            this.storeId =
              this.$store.getters.reservationCalendarStoreId !== "undefined"
                ? this.$store.getters.reservationCalendarStoreId
                : this.$store.getters?.user?.currentAssignment?.[0]?.storeId
                ? this.$store.getters?.user?.currentAssignment?.[0]?.storeId
                : this.user?.employeeDivsions?.[0]?.isHeadquarter
                ? "All"
                : storeOptions[0].value;
            //rovansCode
            // this.storeId = this.$store.getters.reservationCalendarStoreId
            //   ? this.$store.getters.reservationCalendarStoreId
            //   : !this.$store.getters.reservationCalendarStoreId &&
            //     this.$route.query?.storeId
            //   ? this.$route.query.storeId
            //   : !this.$store.getters.reservationCalendarStoreId &&
            //     !this.$route.query?.storeId &&
            //     this.$store.getters?.user?.currentAssignment?.[0]?.storeId
            //   ? this.$store.getters?.user?.currentAssignment?.[0]?.storeId
            //   : storeOptions[0].value;
            this.updateCalendarBusinessHours();
            const storeMemoBtn = document.querySelector(
              ".fc-storeMemo-button"
            ) as HTMLElement;
            if (!this.storeId || this.storeId !== "All") {
              this.getStoreMemo();
              storeMemoBtn.style.display = "block";
            } else {
              const receptionAssBtn = document.querySelector(
                ".fc-receptionAssistance-button"
              ) as HTMLElement;
              receptionAssBtn.style.display = "none";
              storeMemoBtn.style.display = "none";
            }
          }
        })
        .then(() => {
          this.getEmployee();
        });
    },
    updateCalendarBusinessHours() {
      const store: any = this.storeOptions.filter(
        (storeOption: any) => storeOption.value == this.storeId
      )[0];
      const day = moment(this.getCalendarApi()?.getDate()).day();
      if (store) {
        const storeDayBusinessHour: any = store.storeBusinessHours.filter(
          (dates: any) => dates.day == day
        )[0];
        let startTime = "";
        let endFrameTime = "";
        let timeAddedToFrame = "";

        if (storeDayBusinessHour) {
          startTime = storeDayBusinessHour?.openingTime
            ? storeDayBusinessHour?.openingTime
            : "09:00:00";
          endFrameTime = moment(
            storeDayBusinessHour?.closingTime
              ? storeDayBusinessHour?.closingTime
              : "21:30:00",
            "HH:mm:ss"
          )
            // .add(this.timeFrame[TIME_FRAME.THIRTY], "minutes")
            .format("HH:mm");
          timeAddedToFrame = moment("00:00", "HH:mm")
            .add(
              this.timeFrame[
                store?.timeFrame ? store?.timeFrame : this.TIME_FRAME.FIFTEEN
              ],
              "minutes"
            )
            .format("HH:mm");
        } else {
          startTime = "09:00:00";
          endFrameTime = "21:30:00";
          timeAddedToFrame = "00:15";
        }

        let businessHours = [];
        for (let day = 0; day <= 6; day++) {
          const storeBusinessHour = store.storeBusinessHours.filter(
            (dates: any) => dates.day == day
          )[0];

          if (storeBusinessHour) {
            businessHours.push({
              daysOfWeek: [storeBusinessHour.day],
              startTime: moment(
                storeBusinessHour.openingTime,
                "HH:mm:ss"
              ).format("HH:mm"),
              endTime: storeBusinessHour.morningEndTime
                ? moment(storeBusinessHour.morningEndTime, "HH:mm:ss")
                    .add(30, "minutes")
                    .format("HH:mm")
                : moment(storeBusinessHour.closingTime, "HH:mm:ss")
                    .add(30, "minutes")
                    .format("HH:mm"),
            });
            businessHours.push({
              daysOfWeek: [storeBusinessHour.day],
              startTime: storeBusinessHour.afternoonStartTime
                ? moment(
                    storeBusinessHour.afternoonStartTime,
                    "HH:mm:ss"
                  ).format("HH:mm")
                : moment(storeBusinessHour.openingTime, "HH:mm:ss").format(
                    "HH:mm"
                  ),
              endTime: moment(storeBusinessHour.closingTime, "HH:mm:ss")
                .add(30, "minutes")
                .format("HH:mm"),
            });
          } else {
            businessHours.push({
              daysOfWeek: [day],
              startTime: "09:30",
              endTime: "12:00",
            });
            businessHours.push({
              daysOfWeek: [day],
              startTime: "15:30",
              endTime: "21:30",
            });
          }
        }
        if (timeAddedToFrame === "00:45") {
          this.datesFormat = true;
        } else {
          this.datesFormat = false;
        }
        const slotMinTimeTostart = moment(startTime, "HH:mm:ss")
          .format("HH:mm")
          ?.split(":")?.[1]
          ? moment(startTime, "HH:mm:ss").subtract(
              `${
                moment(startTime, "HH:mm:ss").format("HH:mm")?.split(":")?.[1]
              }`,
              "minutes"
            )
          : moment(startTime, "HH:mm:ss").format("HH:mm");
        // this.calendarOptions.businessHours = businessHours;
        this.storeStartTime = startTime;
        this.calendarOptions.slotMinTime =
          moment(slotMinTimeTostart).format("HH:mm");
        // this.calendarOptions.slotMinTime = startTime;
        this.calendarOptions.slotMaxTime = endFrameTime;
        this.calendarOptions.slotDuration = timeAddedToFrame;
        this.calendarOptions.eventMinWidth = Number(
          timeAddedToFrame.split(":")[1] || 15
        );
      }
    },
    calendarToggleButton() {
      this.updateCalendarEventsAndResources();
      this.updateCalendarBusinessHours();
    },
    updateCalendarEventsAndResources(practionerRes1?: any) {
      this.calendarOptions.events = [];
      const practionerRes = practionerRes1
        ? practionerRes1
        : this.practitionerOptions;
      if (this.storeId === "All") {
        this.calendarOptions.resourceGroupField = "store";
        let resources = [];
        const calendarTime: string =
          this.$store.getters.reservationCalendarStoreDate === undefined ||
          this.$store.getters.reservationCalendarStoreDate === "undefined"
            ? moment().format("YYYY-MM-DD")
            : this.$store.getters.reservationCalendarStoreDate;
        // const calendarTime = this.getCalendarApi()?.getDate() || moment();
        let pracEmp: any = [];
        practionerRes.forEach((pracStoreEmp: any) => {
          pracStoreEmp.employeeInfo.forEach((prac: any) => {
            pracEmp.push({
              ...prac,
              storeId: pracStoreEmp.storeId,
              storeName: pracStoreEmp.storeName,
            });
          });
        });
        resources = pracEmp
          .filter(
            (emp: Employee) =>
              moment(`${emp?.employeeEndDate}`).isSameOrAfter(
                `${calendarTime}`,
                "day"
              ) &&
              moment(`${emp?.employeeStartDate}`).isSameOrBefore(
                `${calendarTime}`,
                "day"
              )
          )
          .map((employeeData: any, index: number) => {
            return {
              id: employeeData?.employeeId,
              title: `${employeeData?.employeeNumber || ""} ${
                employeeData?.employeeName
              }`,
              store: employeeData.storeName,
              sortOrder: index,
              employeeEndDate: employeeData?.employeeEndDate,
              employeeStartDate: employeeData?.employeeStartDate,
            };
          });

        this.calendarOptions.resources = resources;
        this.getReservations();
      } else {
        this.calendarOptions.resourceGroupField = "";
        const filteredPractitionerWithStoreId: any = practionerRes.filter(
          (prSt: any) => prSt.storeId == this.storeId
        );
        if (filteredPractitionerWithStoreId.length > 0) {
          let resources = [];
          const calendarTime: string =
            this.$store.getters.reservationCalendarStoreDate === undefined ||
            this.$store.getters.reservationCalendarStoreDate === "undefined"
              ? moment().format("YYYY-MM-DD")
              : this.$store.getters.reservationCalendarStoreDate;
          // const calendarTime = this.getCalendarApi()?.getDate() || moment();
          const practitionerWithStoreId = filteredPractitionerWithStoreId[0];
          resources = practitionerWithStoreId.employeeInfo
            .filter(
              (emp: Employee) =>
                moment(`${emp?.employeeEndDate}`).isSameOrAfter(
                  `${calendarTime}`,
                  "day"
                ) &&
                moment(`${emp?.employeeStartDate}`).isSameOrBefore(
                  `${calendarTime}`,
                  "day"
                )
            )
            .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
            .map((employeeData: any, index: number) => {
              return {
                id: employeeData?.employeeId,
                title: `${employeeData?.employeeNumber || ""} ${
                  employeeData?.employeeName
                }`,
                sortOrder: index,
                employeeEndDate: employeeData?.employeeEndDate,
                employeeStartDate: employeeData?.employeeStartDate,
              };
            });
          if (resources.length > 0) {
            let memos = [];
            for (let i = 0; i < 6; i++) {
              memos.push({
                id: `Reservation Memo ${i}`,
                title: ` `,
                sortOrder: resources.length + i,
              });
            }
            resources = resources.concat(memos);
            this.calendarOptions.resources = resources;
          } else {
            let resource: any = [];
            for (let i = 0; i < 6; i++) {
              resource.push({
                id: `Reservation Memo ${i}`,
                title: ` `,
                sortOrder: i,
              });
            }
            this.calendarOptions.resources = resource;
          }
          this.getReservations();
        } else {
          let resource: any = [];
          for (let i = 0; i < 6; i++) {
            resource.push({
              id: `Reservation Memo ${i}`,
              title: ` `,
              sortOrder: i,
            });
          }
          this.calendarOptions.resources = resource;
          this.getReservations();
        }
      }
      this.setInitialDate();
    },
    async getReservations() {
      this.reservationDetail = null;
      this.isCalendarLoading = true;
      //ajits code
      // const calendarDate =
      //   moment(this.getCalendarApi()?.getDate()).format("YYYY-MM-DD") ||
      //   moment().format("YYYY-MM-DD");

      // const calendarDate =
      //   this.$store.getters.reservationCalendarStoreDate ||
      //   moment().format("YYYY-MM-DD");
      const calendarDate: string =
        this.$store.getters.reservationCalendarStoreDate === undefined ||
        this.$store.getters.reservationCalendarStoreDate === "undefined"
          ? moment().format("YYYY-MM-DD")
          : this.$store.getters.reservationCalendarStoreDate;

      let reservationUrl = `/api/v1/reservations?date=${calendarDate}`;
      if (this.storeId !== "All") {
        reservationUrl += `&store=${this.storeId}`;
      }
      const reservationResponse = await fetch(reservationUrl);
      if (reservationResponse.status) {
        const reservationData = reservationResponse.data.data;
        const nonCancelledReservations = reservationData.filter(
          (reservation: any) =>
            reservation.reservationStatus !== RESERVATION_STATUS.CANCEL
        );
        let updateReservationEvents: any = [];

        nonCancelledReservations.forEach((reservation: any) => {
          updateReservationEvents.push({
            ...reservation,
            resourceId:
              reservation.reservationStatus ==
                RESERVATION_STATUS.NOT_CONFIRMED ||
              !reservation?.practitioner?.id
                ? `Reservation Memo ${this.getMemoResourceIndex(
                    updateReservationEvents,
                    reservation
                  )}`
                : reservation?.practitioner?.id,
            // title: reservation.reservationPerson,
            title: reservation.reservationPerson
              ? reservation.reservationPerson
              : "-",
            start: `${reservation.date}T${reservation.startingTime}+00:00`,
            end: `${reservation.date}T${reservation.endingTime}+00:00`,
            reservationDate: {
              date: reservation.date,
              start: reservation.startingTime,
              end: reservation.endingTime,
              formattedStartDateTime: moment(
                `${reservation.date} ${reservation.startingTime}`,
                "YYYY-MM-DD HH:mm:ss"
              ),
              formattedEndDateTime: moment(
                `${reservation.date} ${reservation.endingTime}`,
                "YYYY-MM-DD HH:mm:ss"
              ),
            },
            description: reservation.managementMemo,
            type: RESERVATION_TYPE.RESERVE,
            editable:
              moment(reservation.date).isSameOrAfter(moment(), "day") &&
              (reservation.reservationStatus ===
                RESERVATION_STATUS.NOT_CONFIRMED ||
                reservation.reservationStatus === RESERVATION_STATUS.CONFIRMED),
            resourceEditable:
              moment(reservation.date).isSameOrAfter(moment(), "day") &&
              (reservation.reservationStatus ===
                RESERVATION_STATUS.NOT_CONFIRMED ||
                reservation.reservationStatus === RESERVATION_STATUS.CONFIRMED),
          });
        });

        this.pratitionerEvents = updateReservationEvents;
      }
      const taskResponse = await fetch(`/api/v1/tasks?date=${calendarDate}`);
      if (taskResponse.status) {
        const taskData = taskResponse.data.data;
        this.taskEvents = taskData
          .filter((task: any) => {
            return task.status !== 3;
          })
          .map((task: any) => {
            return {
              ...task,
              id: task?.id,
              resourceId: task?.practitioner?.id,
              title: task?.name || "",
              start: `${task.date}T${task.startingTime}+00:00`,
              end: `${task.date}T${task.endingTime}+00:00`,
              reservationDate: {
                date: task.date,
                start: task.startingTime,
                end: task.endingTime,
                formattedStartDateTime: moment(
                  `${task.date} ${task.startingTime}`,
                  "YYYY-MM-DD HH:mm:ss"
                ),
                formattedEndDateTime: moment(
                  `${task.date} ${task.endingTime}`,
                  "YYYY-MM-DD HH:mm:ss"
                ),
              },
              description: task?.detail,
              type: RESERVATION_TYPE.TASK,
              editable: moment(task.date).isSameOrAfter(moment(), "day"),
              resourceEditable: moment(task.date).isSameOrAfter(
                moment(),
                "day"
              ),
            };
          });
      }

      const calendarDateHoliday: string =
        this.$store.getters.reservationCalendarStoreDate === undefined ||
        this.$store.getters.reservationCalendarStoreDate === "undefined"
          ? moment().format("YYYY-MM-DD")
          : this.$store.getters.reservationCalendarStoreDate;

      let holidayUrl = `/api/v1/public-holidays?date=${calendarDateHoliday}`;

      const holidayResponse = await fetch(`${holidayUrl}`);

      if (holidayResponse.status) {
        const holidayData = holidayResponse.data.data;
        this.holidayEvents = holidayData
          .filter((holiday: any) => {
            return holiday.status;
          })
          .map((holiday: any) => {
            return {
              ...holiday,
              id: holiday?.id,
              resourceId: holiday?.practitioner?.id,
              title: holiday?.name || "",
              start: `${holiday.date}T${holiday?.startingTime}+00:00`,
              end: `${holiday.date}T${holiday?.endingTime}+00:00`,
              reservationDate: {
                date: holiday?.date,
                start: holiday?.startingTime,
                end: holiday?.endingTime,
                formattedStartDateTime: moment(
                  `${holiday.date} ${holiday.startingTime}`,
                  "YYYY-MM-DD HH:mm:ss"
                ),
                formattedEndDateTime: moment(
                  `${holiday.date} ${holiday.endingTime}`,
                  "YYYY-MM-DD HH:mm:ss"
                ),
              },
              type: RESERVATION_TYPE.PUBLIC_HOLIDAY_AND_OTHERS,
              editable: moment(holiday.date).isSameOrAfter(moment(), "day"),
              resourceEditable: moment(holiday.date).isSameOrAfter(
                moment(),
                "day"
              ),
            };
          });
      }

      // For Regular holidays

      // const store: any = this.storeOptions.filter(
      //   (storeOption: any) => storeOption.value == this.storeId
      // )[0];
      // const date = moment(this.getCalendarApi()?.getDate());
      // const day = date.day();
      //
      // if (store) {
      //   const storeDayBusinessHour: any = store.storeBusinessHours.filter(
      //     (dates: any) => dates.day == day
      //   )[0];
      //   if (storeDayBusinessHour && storeDayBusinessHour.isRegularHoliday) {
      //     this.regularHolidayEvents = [];
      //     this.calendarOptions.resources.forEach((resource: any) => {
      //       let holiday: any = {
      //         id: resource.id,
      //         resourceId: resource.id,
      //         start: `${date.format("YYYY-MM-DD")}T09:30:00+00:00`,
      //         end: `${date.format("YYYY-MM-DD")}T21:30:00+00:00`,
      //         reservationDate: {
      //           date: date,
      //           start: "09:30:00",
      //           end: "21:30:00",
      //           formattedStartDateTime: moment(
      //             `${date} 09:30:00`,
      //             "YYYY-MM-DD HH:mm:ss"
      //           ),
      //           formattedEndDateTime: moment(
      //             `${date} 21:30:00`,
      //             "YYYY-MM-DD HH:mm:ss"
      //           ),
      //         },
      //         type: RESERVATION_TYPE.PUBLIC_HOLIDAY_AND_OTHERS,
      //         absenceType: { name: calendarTexts.PUBLIC_HOLIDAY },
      //       };
      //       this.regularHolidayEvents.push(holiday);
      //     });
      //   } else {
      //     this.regularHolidayEvents = [];
      //   }
      // }
      this.calendarOptions.events = this.taskEvents
        .concat(this.holidayEvents)
        .concat(this.pratitionerEvents)
        .concat(this.regularHolidayEvents);

      this.isCalendarLoading = false;
      if (this.customer.customerNumber) this.setUpDeselectBtn();

      const element = document.getElementById("eventDropModal") as HTMLElement;
      const myModal = BootstrapModal.getInstance(element);
      myModal?.hide();
    },
    selectPreviousReservation(id: any) {
      this.selectedReservationId = id;
    },
    async getStoreMemo() {
      const date =
        this.$store.getters.reservationCalendarStoreDate === undefined ||
        this.$store.getters.reservationCalendarStoreDate === "undefined"
          ? moment().format("YYYY-MM-DD")
          : this.$store.getters.reservationCalendarStoreDate;
      const store =
        this.$store.getters.reservationCalendarStoreId !== "undefined"
          ? this.$store.getters.reservationCalendarStoreId
          : this.$store.getters?.user?.currentAssignment?.[0]?.storeId
          ? this.$store.getters?.user?.currentAssignment?.[0]?.storeId
          : this.storeId;
      const updateMemoStoreRes = await fetch(
        `${process.env.VUE_APP_BASE_API_URL}/api/v1/store-memos?date=${date}&storeId=${store}`
      )
        .then((response) => {
          if (response?.data?.data?.id) {
            this.storeMemoText =
              response?.data?.data?.contents !== null
                ? response?.data?.data?.contents
                : "";
            this.calendarOptions.customButtons.receptionAssistance.text =
              response?.data?.data?.contents;
            const receptionAssistanceBtn = document.getElementsByClassName(
              "fc-receptionAssistance-button"
            );
            const assistanceBtn: HTMLElement =
              receptionAssistanceBtn[0] as HTMLElement;
            if (this.storeMemoText) {
              assistanceBtn.style.display = "block";
            } else {
              assistanceBtn.style.display = "none";
            }
          } else {
            this.storeMemoText = "";
            this.calendarOptions.customButtons.receptionAssistance.text = "";
            const receptionAssistanceBtn = document.getElementsByClassName(
              "fc-receptionAssistance-button"
            );
            const assistanceBtn: HTMLElement =
              receptionAssistanceBtn[0] as HTMLElement;
            assistanceBtn.style.display = "none";
          }
        })
        .catch((err) => {
          this.storeMemoText = "";
          this.calendarOptions.customButtons.receptionAssistance.text = "";
        });
    },
  },
  watch: {
    "$route.query": {
      handler: function (newParam, oldParam) {
        if (this.$route.path === "/reservation-calendar") {
          this.storeId = newParam?.storeId;
          this.getCalendarApi()?.gotoDate(newParam?.date);
          this.selectedReservationId = newParam?.id;
          this.getStores();
        }
      },
    },
    "$store.state.user": function () {
      this.user = this.$store.state.user;
    },
  },
  created() {
    this.user = this.$store.state.user;
    this.storeId =
      String(this.$route.params?.storeId) || String(this.$route.query?.storeId);
    this.selectedReservationId = this.$route.query?.id;
    // this.getCalendarApi()?.gotoDate(this.$route.query?.date);
    this.getStores();
  },
  updated() {
    this.toggleMonthCalendars();
  },
  mounted() {
    this.placeAssistanceInput();
    this.getCalendarApi();
    // this.setInitialDate();
    // this.setInitialDate1();
    if (this.reservationPerson || this.customer.customerNumber) {
      this.setUpDeselectBtn();
    }
    // this.$store.dispatch("setSecondBackButton", false);
    // this.getSelectedStore();
    // this.toggleMonthCalendars();
  },
  unmounted() {
    this.$store.dispatch("setReservationCalendarStoreId", "undefined");
    this.$store.dispatch("setReservationCalendarStoreDate", "undefined");
  },
});
</script>

<style lang="scss" scoped>
@import "@/assets/styles/_variable.scss";
@import "@/assets/styles/_mixins.scss";

.calendar-content-wrapper {
  background-color: $bgLightSecondary;

  .calendar-container {
    height: 576px;
    position: relative;
    overflow: hidden;
    transition: 0.3s ease;

    &.show-more-rows {
      // height: 837px;
      height: 93.95vh;
    }

    @media (max-width: 1440px) {
      height: 559px;

      &.show-more-rows {
        height: 715px;
      }
    }

    #calendar {
      max-width: 1350px;
      margin: 20px auto;

      @media (max-width: 1440px) {
        max-width: 1100px;
      }
    }

    ::v-deep(.fc-license-message) {
      display: none;
    }

    // calendar title and button container
    ::v-deep(.fc .fc-toolbar) {
      align-items: end !important;
    }

    ::v-deep(.fc .fc-toolbar.fc-header-toolbar) {
      margin-bottom: 9px;
    }

    ::v-deep(.fc-toolbar-chunk) {
      // position: relative;
      display: flex;
      align-items: flex-end;
      transition: opacity 0.3s ease-out;
    }

    ::v-deep(.header-input) {
      margin-left: 0;
      position: absolute;
      left: 26%;
      opacity: 0;
      width: unset;
      transition: opacity 0.2s ease-in;

      &:focus {
        border-color: #ced4da;
      }
    }

    // Calendar title
    ::v-deep(.fc-toolbar-title) {
      font-size: 18px;
      font-weight: bold;
      white-space: nowrap;

      &:hover {
        cursor: pointer;
      }
    }

    ::v-deep(.fc-nameHolder-button) {
      margin-right: 9px;
      margin-left: 0;
      font-size: 13px;
      font-weight: bold;
      color: #444 !important;
      position: absolute;
      top: 20px;
    }

    ::v-deep(.fc-nameSuffix-button) {
      margin-right: 9px;
      margin-bottom: 3px;
      margin-left: 0;
      font-size: 13px;
      font-weight: bold;
      color: #444 !important;
    }

    ::v-deep(.fc-customerDesc-button) {
      margin-right: 8px;
      margin-left: 0;
      font-size: 18px;
      font-weight: bold;
    }

    ::v-deep(.fc-customerName-button) {
      margin-right: 8px;
      margin-left: 0;
      font-size: 18px;
      font-weight: bold;
    }

    ::v-deep(.fc-next-button) {
      margin-right: 24px;
    }

    ::v-deep(.fc-deselectButton-button) {
      display: none;
      padding: 12px 16px !important;
      border: 2px solid $primary !important;
      border-radius: 6px;
      margin-left: 0;
      margin-right: 16px;
      position: relative;

      &::after {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        right: -18px;
        width: 1px;
        height: 35px;
        content: "";
        background: $lightPrimary;
      }
    }

    ::v-deep(.fc-receptionAssistance-button) {
      // position: absolute;
      // left: 28%;
      display: none;
      margin-left: 0;
      margin-right: 8px;
      padding: 12px 14px !important;
      background-color: #e6f6fb !important;
      text-decoration: underline;
      transition: all ease-out 0.2s;
      z-index: 1;
      cursor: unset;

      @media (max-width: 1000px) {
        left: 26%;
      }
      @media (max-width: 800px) {
        left: 34%;
      }
    }

    //::v-deep(.fc-registrationButton-button) {
    //  background-color: #009cd3 !important;
    //  padding: 12px 16px !important;
    //  color: #fff !important;
    //  border: 1px solid $primary !important;
    //  margin-right: 16px;
    //  margin-left: 16px;
    //  border-radius: 6px;
    //  position: relative;
    //
    //  &:hover {
    //    background-color: #26abda !important;
    //    border-color: #1aa6d7 !important;
    //  }
    //}

    ::v-deep(.fc-storeMemo-button) {
      background-color: #009cd3 !important;
      padding: 12px 16px !important;
      white-space: nowrap;
      color: #fff !important;
      border: 1px solid $primary !important;
      margin-right: 0;
      margin-left: 0;
      border-radius: 6px;
      position: relative;

      &:hover {
        background-color: #26abda !important;
        border-color: #1aa6d7 !important;
      }
    }

    // button
    ::v-deep(.fc .fc-button-primary) {
      color: $primary;
      border: 0;
      background-color: unset;
      padding: 0;
      white-space: nowrap;

      &:focus {
        box-shadow: unset;
      }
    }

    //button icon
    ::v-deep(.fc .fc-button .fc-icon) {
      font-size: 24px;
    }

    // calendar size
    ::v-deep(.fc-view-harness.fc-view-harness-active) {
      height: 718px !important;

      @media (max-width: 1440px) {
        height: 596px !important;
      }
    }

    ::v-deep(.fc-datagrid-cell-frame) {
      height: 64px !important;

      @media (max-width: 1440px) {
        height: 54px !important;
      }
    }

    ::v-deep(.fc-timeline-slot-frame) {
      height: 64px !important;
      background-color: #fff;

      @media (max-width: 1440px) {
        height: 54px !important;
      }
    }

    ::v-deep(.fc-scroller-harness tr td div) {
      height: 64px !important;

      @media (max-width: 1440px) {
        height: 54px !important;
      }
    }

    // style for timeslots at top
    ::v-deep(.fc .fc-timeline-slot-cushion) {
      margin: auto;
      font-size: 13px;
      color: $body-color;
    }

    // style for display more icon
    ::v-deep(.fc-direction-ltr .fc-datagrid-expander) {
      display: none;
    }

    // style for staff name
    ::v-deep(.fc .fc-datagrid-cell-cushion) {
      background-color: #f0f2f0;
      font-size: 12px;
      width: 100%;
      height: 64px;
      display: flex;
      justify-content: center;
      align-items: center;
      @media (max-width: 1440px) {
        height: 54px;
      }
    }

    // style for select container
    ::v-deep(#store-select) {
      font-weight: bold;
      width: 92px;
      padding: 10px 8px;
      border-color: #d2d6de;
      border-radius: 3px;

      &:focus-visible {
        outline: unset;
      }
    }

    // style for timeslots border
    ::v-deep(.fc-timeline-event-harness:hover) {
      // overflow: hidden;
      cursor: pointer;
    }

    // styles for event
    ::v-deep(.fc-timeline-event) {
      border: 0;
      padding: 0;
    }

    // style for event bg color
    ::v-deep(.fc-h-event) {
      background-color: unset;
    }

    // style for event text color
    ::v-deep(.fc-h-event .fc-event-main) {
      color: #444;
    }

    // style for event resizer
    ::v-deep(.fc-h-event.fc-event-selected .fc-event-resizer) {
      top: unset;
      border-style: none;
      width: unset;
      background: unset;
    }

    // style for selected event
    ::v-deep(.fc-event-selected) {
      border: 1px solid $primary !important;
      top: -0.75px;
      z-index: 9;

      &::after {
        background: unset;
      }
    }

    ::v-deep(.fc-direction-ltr
        .fc-h-event:not(.fc-event-selected)
        .fc-event-resizer-start, .fc-direction-rtl
        .fc-h-event:not(.fc-event-selected)
        .fc-event-resizer-end) {
      left: -11px !important;
    }

    ::v-deep(.fc-direction-ltr
        .fc-timeline-event.fc-event-end, .fc-direction-ltr
        .fc-timeline-more-link) {
      margin-right: 0;

      &:hover {
        z-index: 9;
      }
    }

    // style for selected prev selector
    ::v-deep(.fc-event-resizer.fc-event-resizer-start) {
      // position: relative;
      &::before {
        content: url("../../assets/images/prev.svg");
        top: 0;
        bottom: 0;
        left: -8px;
      }
    }

    // style for selected next selector
    ::v-deep(.fc-event-resizer.fc-event-resizer-end) {
      // position: relative;
      &::before {
        content: url("../../assets/images/next.svg");
        top: 0;
        bottom: 0;
        right: 0px;
        left: -5px;
      }
    }

    // style for timeslots border
    // ::v-deep(td.fc-timeline-slot.fc-timeline-slot-lane) {
    // border-color: blue;
    // }
    // style for timeslots border bottom row
    ::v-deep(td.fc-timeline-lane.fc-resource) {
      // border-color: blue;
      background-color: #fff;
    }

    // style for border of small time slots
    ::v-deep(.fc .fc-timeline-slot-minor) {
      border-style: solid;
      border-color: #fff !important;

      & > div {
        border-right: none;
        border-left: none;
      }
    }

    // ::v-deep(td.fc-timeline-slot-minor) {
    //   border-style: solid;
    //   position: relative;
    //   // border-color: #fff !important;

    //   &::before {
    //     position: absolute;
    //     bottom: 0;
    //     border-right: none;
    //     height: 2px;
    //     content: "";
    //     left: 0;
    //     right: 0;
    //     background-color: #fff;
    //     border-left: 1px solid red;
    //   }
    // }
    // style for events
    ::v-deep(#myEvent) {
      display: flex;
      flex-direction: column;
      font-size: 7px;
      line-height: 10.5px;
      padding: 11px 3px;
      white-space: nowrap;
      overflow: hidden;
      border-radius: 3px;

      & > div {
        margin-bottom: 4px;
        min-height: 10px !important;
      }

      // &::before {
      //   position: absolute;
      //   top: 3px;
      //   content: "";
      //   height: 2px;
      //   background: #5e5e5e;
      //   width: 100%;
      //   margin-left: -3px;
      // }
    }

    // style for event title
    ::v-deep(.timeline-bar) {
      // font-weight: bold;
      position: absolute;
      top: -12px;
      content: "";
      height: 2px !important;
      width: 100%;
      margin-left: -3px;
    }

    ::v-deep(.passed-event) {
      position: relative;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        display: block;
        height: 100%;
        width: 100%;
        background-color: rgba(124, 124, 124, 0.2);
        z-index: 1;
      }
    }

    // style for event title
    ::v-deep(#myEventTitle) {
      font-weight: bold;
    }

    ::v-deep(.l-span) {
      display: inline-block;
      text-align: center;
      height: 10px;
      width: 8px;
      background-color: #33ce39;
      color: #fff;
      margin-right: 2px;
    }

    ::v-deep(.l-image-span) {
      display: inline-block;
      background-image: url("../../assets/icons/address-card-regular.svg");
      background-size: cover;
      background-repeat: no-repeat;
      text-align: center;
      height: 10px;
      width: 8px;
      margin-right: 2px;
    }

    .show-more {
      position: absolute;
      z-index: 2;
      bottom: 0;
      width: 100%;
      background-color: #bfe6f4;
      border: 1px solid $primary;
      border-right: 0;
      border-left: 0;
      border-radius: 0;
    }
  }
}

//
.arrow-down {
  max-width: 16px;
  transform: rotate(0deg);
  transition: transform 0.1s linear;

  &.up {
    transform: rotate(180deg);
    transition: transform 0.1s linear;
  }
}

.loader-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 93vh;
  width: 100%;
}

.loader {
  border: 16px solid #f3f3f3; /* Light grey */
  border-top: 16px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 120px;
  height: 120px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

#storeMemoModal {
  .modal-dialog {
    max-width: 554px;

    .modal-content {
      padding: 24px;

      .modal-header,
      .modal-footer {
        border-color: #bfe6f4;
      }

      .modal-header {
        padding: 0;

        h4 {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 0;
        }
      }

      .modal-content {
        display: flex;
        justify-content: center;

        .form-control {
          max-width: 210px;
        }
      }

      .modal-footer {
        .btn-secondary {
          min-width: 88px;
          margin-right: 24px;
        }

        .btn-primary {
          min-width: 240px;
        }
      }
    }
  }
}

.error {
  border-color: #fc4848 !important;
}

.error-box {
  display: inline-block;
  padding: 6px 14px;
  color: #fc4848;
  background-color: #fc484826;
}

.radio-error {
  border: 1px solid #fc4848;
}
</style>
