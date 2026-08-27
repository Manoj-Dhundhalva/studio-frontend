export class DateUtils {
  private static instance: DateUtils;

  private constructor() {}

  static getInstance(): DateUtils {
    if (!DateUtils.instance) {
      DateUtils.instance = new DateUtils();
    }
    return DateUtils.instance;
  }

  getCurrentEpochSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  getEpochSecondsForDate = (date: string | Date): number => {
    return Math.floor(new Date(date).getTime() / 1000);
  };
}
