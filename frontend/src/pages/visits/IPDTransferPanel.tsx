import type { Bed, Room } from "../../types";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import type { DoctorOption, TransferFormState } from "./visitTypes";

type IPDTransferPanelProps = {
  transferVisitId: number | null;
  transferForm: TransferFormState;
  doctors: DoctorOption[];
  rooms: Room[];
  availableBeds: Bed[];
  onChange: (value: TransferFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export const IPDTransferPanel = ({
  transferVisitId,
  transferForm,
  doctors,
  rooms,
  availableBeds,
  onChange,
  onSubmit,
  onCancel,
}: IPDTransferPanelProps) => {
  if (!transferVisitId) {
    return null;
  }

  return (
    <Card className="rounded-[28px]">
      <h2 className="mb-4 text-lg font-semibold">Admit OPD #{transferVisitId} to IPD</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Attending Doctor" value={transferForm.attendingDoctorId} onChange={(e) => onChange({ ...transferForm, attendingDoctorId: e.target.value })}>
          <option value="">Select doctor</option>
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
        </Select>
        <Select label="Room" value={transferForm.roomId} onChange={(e) => onChange({ ...transferForm, roomId: e.target.value, bedId: "" })}>
          <option value="">Select room</option>
          {rooms.map((room) => <option key={room.id} value={room.id}>{room.ward} / {room.name}</option>)}
        </Select>
        <Select label="Bed" value={transferForm.bedId} onChange={(e) => onChange({ ...transferForm, bedId: e.target.value })}>
          <option value="">Select bed</option>
          {availableBeds.map((bed: Bed) => <option key={bed.id} value={bed.id}>{bed.bedNumber} ({bed.status})</option>)}
        </Select>
        <Input label="Ward" value={transferForm.ward} onChange={(e) => onChange({ ...transferForm, ward: e.target.value })} />
        <Input label="Room Label" value={transferForm.room} onChange={(e) => onChange({ ...transferForm, room: e.target.value })} />
        <Input label="Bed Label" value={transferForm.bed} onChange={(e) => onChange({ ...transferForm, bed: e.target.value })} />
        <Input label="Diagnosis" value={transferForm.diagnosis} onChange={(e) => onChange({ ...transferForm, diagnosis: e.target.value })} />
        <Input label="Reason" value={transferForm.reason} onChange={(e) => onChange({ ...transferForm, reason: e.target.value })} />
        <Input className="md:col-span-3" label="Transfer Notes" value={transferForm.notes} onChange={(e) => onChange({ ...transferForm, notes: e.target.value })} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={onSubmit}>Confirm Admission</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
};
