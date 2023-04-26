import { LightningElement, wire, api, track } from "lwc";
import getContacts from "@salesforce/apex/ContactController.getContacts";
import createContact from "@salesforce/apex/ContactController.createContact";
import { refreshApex } from "@salesforce/apex";
import {
  createRecord,
  updateRecord,
  deleteRecord
} from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import FIRST_NAME_FIELD from "@salesforce/schema/Contact.FirstName";
import LAST_NAME_FIELD from "@salesforce/schema/Contact.LastName";
import TITLE_FIELD from "@salesforce/schema/Contact.Title";
import PHONE_FIELD from "@salesforce/schema/Contact.Phone";
import EMAIL_FIELD from "@salesforce/schema/Contact.Email";
import STATUS_FIELD from "@salesforce/schema/Contact.Status__c";

import {
  subscribe,
  unsubscribe,
  onError,
  setDebugFlag,
  isEmpEnabled
} from "lightning/empApi";

const CONTACT_PE_CHANNEL = "/event/Contact_Event__e";

// Define constants
const COLS = [
  {
    label: "First Name",
    fieldName: FIRST_NAME_FIELD.fieldApiName,
    editable: true
  },
  {
    label: "Last Name",
    fieldName: LAST_NAME_FIELD.fieldApiName,
    editable: true
  },
  { label: "Title", fieldName: TITLE_FIELD.fieldApiName, editable: true },
  {
    label: "Phone",
    fieldName: PHONE_FIELD.fieldApiName,
    type: "phone",
    editable: true
  },
  {
    label: "Email",
    fieldName: EMAIL_FIELD.fieldApiName,
    type: "email",
    editable: true
  },
  {
    label: "Status",
    fieldName: STATUS_FIELD.fieldApiName,
    editable: true
  }
];

export default class ContactsTable extends LightningElement {
  @api recordId;
  @track records = [];
  selectedIds = [];
  isLoading = false;

  columns = COLS;
  draftValues = [];
  subscription;

  @wire(getContacts, { accId: "$recordId" })
  contacts;

  // Computed property to determine if rows should be displayed
  get shouldDisplayRow() {
    return this.records.length > 0;
  }

  async connectedCallback() {
    // Check if EMP API is available
    const isEmpApiEnabled = await isEmpEnabled();
    if (!isEmpApiEnabled) {
      console.log("The EMP API is not enabled.");
      return;
    }
    // Handle EMP API debugging and error reporting
    setDebugFlag(true);
    onError((error) => {
      console.log("EMP API error", error);
    });

    // Subscribe to Manufacturing Event plaform event
    try {
      this.subscription = await subscribe(CONTACT_PE_CHANNEL, -1, (event) => {
        console.log(event.data);
        if (event.data.payload) {
          let contactInfo = {
            Email: "",
            Phone: "",
            FirstName: event.data.payload.FirstName__c,
            LastName: event.data.payload.LastName__c,
            Status__c: event.data.payload.Status__c,
            AccountId: this.recordId
          };
          createContact({ contactJSON: JSON.stringify(contactInfo) })
            .then((result) => {
              // Show a success message to the user
              this.dispatchEvent(
                new ShowToastEvent({
                  title: "Success",
                  message: "Contact created successfully",
                  variant: "success"
                })
              );
              refreshApex(this.contacts);
            })
            .catch((error) => {
              // Show an error message to the user
              this.dispatchEvent(
                new ShowToastEvent({
                  title: "Error",
                  message: error.body.message,
                  variant: "error"
                })
              );
            });
        }
      });
    } catch (error) {
      console.log("API error", error);
    }
  }

  disconnectedCallback() {
    if (this.subscription) {
      unsubscribe(this.subscription);
    }
  }

  // Add row to the table
  addRow() {
    let myNewRow = {
      Id: this.records.length + 1,
      Email: "",
      FirstName: "",
      LastName: "",
      Phone: "",
      Status__c: "New",
      AccountId: this.recordId
    };
    this.records = [...this.records, myNewRow];
  }

  // Handle delete row from table
  handleDeleteRow(event) {
    // Find the row to delete
    const rowIndexToRemove = this.records.findIndex(
      (row) => row.Id == event.target.dataset.rowId
    );

    // If the row is found, it is deleted using the splice() method.
    if (rowIndexToRemove !== -1) {
      this.records.splice(rowIndexToRemove, 1);
    }
  }

  updateValues(event) {
    let recordToUpdate = this.records.find(
      (row) => row.Id == event.target.dataset.rowId
    );
    recordToUpdate[event.target.name] = event.target.value;
  }

  // Get selected rows from datatable
  getSelectedRecords(event) {
    const selectedRows = event.detail.selectedRows;
    this.selectedIds = selectedRows.map((row) => row.Id);
  }

  // Handle delete rows from datatable
  async handleDeleteRows() {
    try {
      this.isLoading = true;

      // Use Promise.all to delete all selected rows in parallel
      const promises = this.selectedIds.map((Id) => {
        return deleteRecord(Id);
      });

      await Promise.all(promises);

      this._handleToastEvent(
        "Success",
        "All Contacts deleted successfully",
        "success"
      );

      // Display fresh data in the datatable
      await refreshApex(this.contacts);
      this.selectedIds = [];
    } catch (error) {
      this._handleToastEvent(
        "Error deleting contacts",
        error.body.message,
        "error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  // clear all rows from the table
  clearAction() {
    this.records = [];
    this.addRow();
  }

  // Handle create new contact(s)
  async handleCreate() {
    try {
      this.isLoading = true;

      // Use Promise.all to create all records in parallel
      // const promises = this.records.map(({ Id, ...rest }) => {
      //   const fields = { ...rest };
      //   const recordInput = { apiName: "Contact", fields };
      //   console.log(JSON.stringify(recordInput));
      //   return createRecord(recordInput);
      // });

      // await Promise.all(promises);

      this._handleToastEvent(
        "Success",
        "All Contacts created successfully",
        "success"
      );

      // Clear all rows from the datatable and rerender datatable
      this.clearAction();
      await refreshApex(this.contacts);
    } catch (error) {
      // Report error with a toast
      this._handleToastEvent(
        "Error creating contacts",
        error.body.message,
        "error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  // Handle save changes to existing contact(s)
  async handleSave(event) {
    // Convert datatable draft values into record objects
    const records = event.detail.draftValues.slice().map((draftValue) => {
      const fields = Object.assign({}, draftValue);
      return { fields };
    });

    // Clear all datatable draft values
    this.draftValues = [];

    try {
      // Use Promise.all to update all records in parallel
      const recordUpdatePromises = records.map((record) =>
        updateRecord(record)
      );
      await Promise.all(recordUpdatePromises);

      // Report success with a toast
      this._handleToastEvent(
        "Success",
        "Contacts updated successfully",
        "success"
      );

      // Display fresh data in the table
      await refreshApex(this.contacts);
    } catch (error) {
      // Report error with a toast
      this._handleToastEvent(
        "Error updating or reloading contacts",
        error.body.message,
        "error"
      );
    }
  }

  // Private method to handle toast event
  _handleToastEvent(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
      })
    );
  }
}
