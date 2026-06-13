#!/usr/bin/env python3
"""
Sample plugin for ripNotepad++ — demonstrates JSON-RPC 2.0 protocol.

Plugin lifecycle:
1. ripNotepad++ spawns this script as a sidecar process
2. Communicates via JSON-RPC 2.0 over stdin/stdout
3. Plugin reads requests from stdin line by line
4. Plugin writes responses to stdout line by line
5. Stderr goes to the editor's log

Supported methods:
- ping        → returns "pong"
- getInfo     → returns plugin info
- echo        → returns the input params
- shutdown    → exits gracefully
"""

import sys
import json
import os


def send_response(id_val, result=None, error=None):
    """Send a JSON-RPC 2.0 response to stdout."""
    response = {"jsonrpc": "2.0", "id": id_val}
    if error:
        response["error"] = error
    else:
        response["result"] = result
    sys.stdout.write(json.dumps(response) + "\n")
    sys.stdout.flush()


def handle_request(request):
    """Handle a single JSON-RPC 2.0 request."""
    method = request.get("method", "")
    params = request.get("params")
    req_id = request.get("id")

    if method == "ping":
        return send_response(req_id, result="pong")

    elif method == "getInfo":
        return send_response(req_id, result={
            "name": "sample-hello",
            "version": "1.0.0",
            "description": "A hello world sample plugin",
            "author": "ripNotepad++ Team",
        })

    elif method == "echo":
        return send_response(req_id, result=params)

    elif method == "shutdown":
        send_response(req_id, result="ok")
        sys.exit(0)

    elif method == "getActiveFile":
        # Now works! Editor state is cached in Rust
        # Just relay the request — Rust intercepts editor.* methods
        return send_response(req_id, result={
            "note": "This method is now handled by the Rust backend cache",
            "available": True,
        })

    elif method == "insertText":
        return send_response(req_id, result={
            "note": "Text insertion supported via editor.insertText",
            "available": True,
        })

    elif method == "monitor":
        # Start monitoring editor events
        sys.stderr.write(f"[sample-hello] Now monitoring editor events\n")
        sys.stderr.flush()
        return send_response(req_id, result={"monitoring": True})

    else:
        return send_response(req_id, error={
            "code": -32601,
            "message": f"Method not found: {method}",
        })


def main():
    """Main loop: read JSON-RPC requests from stdin."""
    # Signal ready by writing nothing — editor detects process started
    sys.stderr.write("sample-hello plugin started\n")
    sys.stderr.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError as e:
            sys.stderr.write(f"Invalid JSON: {e}\n")
            continue

        # Handle notification (no id)
        if "id" not in request or request.get("id") is None:
            method = request.get("method", "")
            if method == "shutdown":
                sys.exit(0)
            # Log received notifications for monitoring
            if method.startswith("editor."):
                event_type = method.replace("editor.", "")
                params = request.get("params", {})
                sys.stderr.write(f"[sample-hello] Event: {event_type} {params}\n")
                sys.stderr.flush()
            continue

        handle_request(request)


if __name__ == "__main__":
    main()
