
export class ClockStream {
    message: string;
    messageOnly: boolean;
    seconds: number;
    minor?: ClockStream;
    major?: ClockStream;
    reported?: ClockStream;
}

export class ClockConstants {
    weekdayArray: Array<string> = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    monthArray: Array<string> = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    tzOffsetToMilTimecodeDict: Object = {
        "-12": "Y-",
        "-11": "X",
        "-10": "W",
        "-9": "V",
        "-8": "U",
        "-7": "T",
        "-6": "S",
        "-5": "R",
        "-4": "Q",
        "-3": "P",
        "-2": "O",
        "-1": "N",
        "0": "Z",
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
        "5": "E",
        "6": "F",
        "7": "G",
        "8": "H",
        "9": "I",
        "10": "K",
        "11": "L",
        "12": "M"
    }
}