from api.deps import get_agent


def run_demo() -> None:
    query = "What skills does William posses?\n\n"
    for event in get_agent().stream(
        {"messages": [{"role": "user", "content": query}]},
        stream_mode="values",
    ):
        event["messages"][-1].pretty_print()


if __name__ == "__main__":
    run_demo()
