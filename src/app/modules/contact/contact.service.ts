import Contact, { IContact } from "./Contact.model";
import { sendContactEmail } from "./email.service";

export interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  message: string;
}

export const createContact = async (
  contactData: ContactData
): Promise<IContact> => {
  // Validate required fields
  if (
    !contactData.firstName ||
    !contactData.lastName ||
    !contactData.email ||
    !contactData.message
  ) {
    throw new Error("All required fields must be provided");
  }

  // Create contact in database
  const contact = await Contact.create(contactData);

  // Send email notification
  try {
    await sendContactEmail(contactData);
  } catch (emailError) {
    console.error("Failed to send contact email:", emailError);
    // Don't throw error - we still want to save the contact even if email fails
  }

  return contact;
};

export const getAllContacts = async (): Promise<IContact[]> => {
  return await Contact.find().sort({ createdAt: -1 });
};

export const getContactById = async (id: string): Promise<IContact | null> => {
  return await Contact.findById(id);
};

export const markAsRead = async (id: string): Promise<IContact | null> => {
  return await Contact.findByIdAndUpdate(id, { isRead: true }, { new: true });
};

export const markAsResponded = async (id: string): Promise<IContact | null> => {
  return await Contact.findByIdAndUpdate(
    id,
    { isResponded: true },
    { new: true }
  );
};
