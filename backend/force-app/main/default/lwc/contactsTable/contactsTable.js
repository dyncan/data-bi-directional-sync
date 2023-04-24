import { LightningElement, wire, api, track } from "lwc";
import getContacts from "@salesforce/apex/ContactController.getContacts";
import { refreshApex } from "@salesforce/apex";
import { createRecord, updateRecord } from "lightning/uiRecordApi";

import { ShowToastEvent } from "lightning/platformShowToastEvent";
import FIRST_NAME_FIELD from "@salesforce/schema/Contact.FirstName";
import LAST_NAME_FIELD from "@salesforce/schema/Contact.LastName";
import TITLE_FIELD from "@salesforce/schema/Contact.Title";
import PHONE_FIELD from "@salesforce/schema/Contact.Phone";
import EMAIL_FIELD from "@salesforce/schema/Contact.Email";
import STATUS_FIELD from "@salesforce/schema/Contact.Status__c";

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
  columns = COLS;
  draftValues = [];
  @track records = [];
  isLoading = false;

  @wire(getContacts, { accId: "$recordId" })
  contacts;

  get shouldDisplayRow() {
    return this.records.length > 0;
  }

  //to add row
  addRow() {
    let myNewElement = {
      Id: this.records.length + 1,
      Email: "",
      FirstName: "",
      LastName: "",
      Phone: "",
      Status__c: "",
      AccountId: this.recordId
    };
    this.records = [...this.records, myNewElement];
  }

  handleDelete(event) {
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

  clearAction() {
    this.records = [];
    this.addRow();
  }

  async handleCreate() {
    try {
      this.isLoading = true;
      // // Create all records in parallel by UI API
      const promises = this.records.map(({ Id, ...rest }) => {
        const fields = { ...rest };
        const recordInput = { apiName: "Contact", fields };
        return createRecord(recordInput);
      });

      await Promise.all(promises);

      // Report success with a toast
      this._handleToastEvent(
        "Success",
        "All Contacts created successfully",
        "success"
      );

      this.clearAction();
      // Display fresh data in the datatable
      await refreshApex(this.contacts);
    } catch (error) {
      this._handleToastEvent(
        "Error updating or reloading contacts",
        error.body.message,
        "error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  async handleSave(event) {
    // Convert datatable draft values into record objects
    const records = event.detail.draftValues.slice().map((draftValue) => {
      const fields = Object.assign({}, draftValue);
      return { fields };
    });

    // Clear all datatable draft values
    this.draftValues = [];

    try {
      // Update all records in parallel thanks to the UI API
      const recordUpdatePromises = records.map((record) =>
        updateRecord(record)
      );
      await Promise.all(recordUpdatePromises);

      // Report success with a toast
      this._handleToastEvent("Success", "Contacts updated", "success");

      // Display fresh data in the datatable
      await refreshApex(this.contacts);
    } catch (error) {
      this._handleToastEvent(
        "Error updating or reloading contacts",
        error.body.message,
        "error"
      );
    }
  }

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
