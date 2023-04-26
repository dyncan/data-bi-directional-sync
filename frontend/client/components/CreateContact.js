import React, { useState } from "react";

const CreateContact = (props) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    status__c: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    props.onFormSubmit(formData);
  };

  return (
    <article className="slds-card" style={{ width: "32%", margin: "2rem" }}>
      <div className="slds-card__header slds-grid">
        <header className="slds-media slds-media_center slds-has-flexi-truncate">
          <div className="slds-media__figure">
            <span
              className="slds-icon_container slds-icon-standard-contact"
              title="contact"
            >
              <svg className="slds-icon slds-icon_small" aria-hidden="true">
                <use xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#contact"></use>
              </svg>
              <span className="slds-assistive-text">Create Contact</span>
            </span>
          </div>
          <div className="slds-media__body">
            <h2 className="slds-card__header-title">
              <a
                href="#"
                className="slds-card__header-link slds-truncate"
                title="Contacts"
              >
                <span>Create Contact</span>
              </a>
            </h2>
          </div>
        </header>
      </div>
      <div className="slds-card__body slds-card__body_inner">
        <form onSubmit={handleSubmit}>
          <div className="slds-form">
            <div className="slds-form-element slds-form-element_stacked">
              <label className="slds-form-element__label">First Name</label>
              <div className="slds-form-element__control">
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Placeholder text…"
                  className="slds-input"
                />
              </div>
            </div>
            <div className="slds-form-element slds-form-element_stacked">
              <label className="slds-form-element__label">Last Name</label>
              <div className="slds-form-element__control">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Placeholder text…"
                  className="slds-input"
                />
              </div>
            </div>

            <div className="slds-form-element slds-form-element_stacked">
              <label className="slds-form-element__label">Status</label>
              <div className="slds-form-element__control">
                <input
                  type="text"
                  id="status"
                  name="status__c"
                  value={formData.status__c}
                  onChange={handleChange}
                  placeholder="Placeholder text…"
                  className="slds-input"
                />
              </div>
            </div>

            <div className="slds-form-element slds-form-element_stacked slds-m-top_medium">
              <button className="slds-button slds-button_neutral">
                Submit
              </button>
            </div>
          </div>
        </form>
      </div>
    </article>
  );
};

export default CreateContact;
