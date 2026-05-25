package backend

import (
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ant-chrome/backend/internal/browser"
	"ant-chrome/backend/internal/config"

	"github.com/gorilla/websocket"
)

func TestBrowserInstanceOpenUrlCreatesNewWindowTarget(t *testing.T) {
	t.Parallel()

	received := make(chan cdpMessage, 1)
	upgrader := websocket.Upgrader{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/json/version":
			_ = json.NewEncoder(w).Encode(map[string]string{
				"webSocketDebuggerUrl": "ws://" + r.Host + "/devtools/browser/test",
			})
		case "/devtools/browser/test":
			conn, err := upgrader.Upgrade(w, r, nil)
			if err != nil {
				t.Errorf("websocket upgrade error = %v", err)
				return
			}
			defer conn.Close()
			var msg cdpMessage
			if err := conn.ReadJSON(&msg); err != nil {
				t.Errorf("ReadJSON() error = %v", err)
				return
			}
			received <- msg
			_ = conn.WriteJSON(cdpResponse{Id: msg.Id, Result: map[string]any{"targetId": "new-target"}})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	_, portValue, err := net.SplitHostPort(strings.TrimPrefix(server.URL, "http://"))
	if err != nil {
		t.Fatalf("SplitHostPort() error = %v", err)
	}
	port, err := net.LookupPort("tcp", portValue)
	if err != nil {
		t.Fatalf("LookupPort() error = %v", err)
	}

	app := NewApp(t.TempDir())
	app.browserMgr = browser.NewManager(config.DefaultConfig(), app.appRoot)
	app.browserMgr.Profiles["profile-open-url"] = &browser.Profile{
		ProfileId:  "profile-open-url",
		Running:    true,
		DebugReady: true,
		DebugPort:  port,
	}

	if ok := app.BrowserInstanceOpenUrl("profile-open-url", "example.com"); !ok {
		t.Fatal("BrowserInstanceOpenUrl() = false, want true")
	}

	select {
	case msg := <-received:
		if msg.Method != "Target.createTarget" {
			t.Fatalf("CDP method = %q, want Target.createTarget", msg.Method)
		}
		if msg.Params["url"] != "https://example.com" {
			t.Fatalf("CDP url = %#v, want https://example.com", msg.Params["url"])
		}
		if msg.Params["newWindow"] != true {
			t.Fatalf("CDP newWindow = %#v, want true", msg.Params["newWindow"])
		}
	case <-time.After(time.Second):
		t.Fatal("BrowserInstanceOpenUrl() did not create a new CDP target")
	}
}
