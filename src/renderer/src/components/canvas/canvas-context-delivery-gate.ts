export class CanvasContextDeliveryGate {
  private readonly delivered = new Map<string, string>()
  private readonly inFlight = new Set<string>()

  private key(bindingId: string, signature: string): string {
    return `${bindingId}\0${signature}`
  }

  begin(bindingId: string, signature: string, retry = false): boolean {
    if (this.delivered.get(bindingId) === signature) return false
    const key = this.key(bindingId, signature)
    if (!retry && this.inFlight.has(key)) return false
    this.inFlight.add(key)
    return true
  }

  complete(bindingId: string, signature: string): void {
    this.delivered.set(bindingId, signature)
    this.inFlight.delete(this.key(bindingId, signature))
  }

  fail(bindingId: string, signature: string): void {
    this.inFlight.delete(this.key(bindingId, signature))
  }
}
