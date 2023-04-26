import React from "react";

const Contacts = (props) => {
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
                <span>Incoming Contacts From Salesforce</span>
              </a>
            </h2>
          </div>
        </header>
      </div>
      <div className="slds-card__body slds-card__body_inner">
        <table className="slds-table slds-table_cell-buffer slds-table_bordered slds-table_striped">
          <thead>
            <tr className="slds-line-height_reset">
              <th className="" scope="col">
                <div className="slds-truncate" title="First Name">
                  First Name
                </div>
              </th>
              <th className="" scope="col">
                <div className="slds-truncate" title="Last Name">
                  Last Name
                </div>
              </th>
              <th className="" scope="col">
                <div className="slds-truncate" title="Title">
                  Title
                </div>
              </th>
              <th className="" scope="col">
                <div className="slds-truncate" title="Status">
                  Status
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {props.contactList.map((item) => (
              <tr className="slds-hint-parent" key={item.Id}>
                <th data-label="First Name" scope="row">
                  <div className="slds-truncate" title={item.FirstName}>
                    <a href="#">{item.FirstName}</a>
                  </div>
                </th>
                <td data-label="Last Name">
                  <div className="slds-truncate" title={item.LastName}>
                    {item.LastName}
                  </div>
                </td>
                <td data-label="Title">
                  <div className="slds-truncate" title={item.Title}>
                    {item.Title}
                  </div>
                </td>
                <td data-label="Status">
                  <div className="slds-truncate" title={item.Status__c}>
                    {item.Status__c}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
};

export default Contacts;
