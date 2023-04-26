/*
 * @date          April 2023
 * @author        Peter Dong
 * @email         imdongyannan@gmail.com
 * @description   Apex class for contact related functions
 */
public with sharing class ContactController {
  /**
   * @description Method to fetch contact records from DB
   */
  @AuraEnabled(Cacheable=true)
  public static List<Contact> getContacts(String accId) {
    return [
      SELECT Id, Name, FirstName, LastName, Phone, Email, Title, Status__c
      FROM Contact
      WHERE AccountId = :accId
      WITH SECURITY_ENFORCED
      ORDER BY CreatedDate DESC
      LIMIT 100
    ];
  }

  @AuraEnabled(Cacheable=false)
  public static void createContact(String contactJSON) {
    System.debug(contactJSON);
    Contact newContact = (Contact) JSON.deserialize(contactJSON, Contact.class);
    Database.insert(newContact, true);
  }
}
