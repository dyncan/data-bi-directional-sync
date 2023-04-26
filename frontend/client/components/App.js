import React, { useState, useEffect } from "react";
import LoginPanel from "./LoginPanel.js";
import LogoutPanel from "./LogoutPanel.js";
import Spinner from "./Spinner.js";
import ContactList from "./Contacts.js";
import { WebSocketClient } from "./webSocketClient.js";

const WHOAMI_URL = "/auth/whoami";
const WS_URL = `${window.location.protocol === "http:" ? "ws://" : "wss://"}${
  window.location.host
}/websockets`;

export default function App() {
  const [wsRef, setWsRef] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contactList, setContactList] = useState([]);

  const handleLogin = (isLoading) => {
    setIsLoading(isLoading);
    localStorage.setItem("loading", isLoading);
  };

  const fetchData = async () => {
    try {
      const response = await fetchCurrentUser();
      setIsLoading(false);
      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.removeItem("loading");
        setUser(userData);
      } else if (response.status !== 401) {
        console.log(
          "Failed to retrieve logged user.",
          JSON.stringify(response)
        );
        localStorage.clear();
      } else {
        localStorage.clear();
      }
    } catch (error) {
      localStorage.clear();
      // Display an error message to the user
    }
  };

  useEffect(() => {
    setIsLoading(false);

    if (localStorage.getItem("loading") === "true") {
      setIsLoading(true);
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser != null) {
      setUser(JSON.parse(storedUser));
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (!wsRef) {
      wsConnect();
    }
  }, [wsRef]);

  const wsConnect = () => {
    const wsRef = new WebSocketClient(WS_URL);
    wsRef.connect();
    wsRef.addMessageListener(async (message) => {
      if (message?.type === "statusEvent") {
        const { contactId, status } = message.data ?? {};
        const response = await fetchContact(contactId);
        if (response && response.records) {
          console.log("OUTPUT : ", response);
          setContactList((prevDataList) =>
            Object.values(
              [...prevDataList, ...response.records].reduce((acc, curr) => {
                acc[curr.Id] = curr;
                return acc;
              }, {})
            )
          );
        }
      }
    });
    setWsRef(wsRef);
  };

  const fetchCurrentUser = async () =>
    await fetch(WHOAMI_URL, {
      method: "get",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

  const fetchContact = async (contactId) => {
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: "get",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    return response.json();
  };

  const handleStatusChange = (formData) => {
    formData.userId = user.user_id;
    const eventData = {
      type: "statusEvent",
      data: formData,
    };
    wsRef.send(JSON.stringify(eventData));
  };

  return (
    <div>
      {user == null ? (
        <LoginPanel handleLogin={handleLogin} />
      ) : (
        <div>
          Logged in as{" "}
          <span style={{ fontWeight: "bold" }}>{user.username}</span>!{" "}
          <LogoutPanel />
          <ContactList
            contactList={contactList}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}
      {isLoading && <Spinner />}
    </div>
  );
}
